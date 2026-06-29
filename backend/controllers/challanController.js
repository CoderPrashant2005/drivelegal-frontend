const pool = require("../config/db");
const logger = require("../utils/logger");

// CITIZEN: list own challans
exports.getMyChallans = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const params = [req.user.id];
    let where = "WHERE citizen_id = ?";

    if (status) {
      where += " AND status = ?";
      params.push(status);
    }

    const [rows] = await pool.query(
      `SELECT * FROM challans ${where} ORDER BY issued_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    const [[count]] = await pool.query(
      `SELECT COUNT(*) AS total FROM challans ${where}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      pagination: { total: count.total, page: +page, limit: +limit },
    });
  } catch (err) { next(err); }
};

// Get single challan by ID
exports.getChallanById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, u.name AS citizen_name, o.name AS officer_name
       FROM challans c
       LEFT JOIN users u ON c.citizen_id = u.id
       LEFT JOIN users o ON c.officer_id = o.id
       WHERE c.id = ?`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Challan not found" });
    }

    const challan = rows[0];

    // Citizens can only view their own challans
    if (req.user.role === "citizen" && challan.citizen_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    res.json({ success: true, challan });
  } catch (err) { next(err); }
};

// OFFICER: issue a new challan
exports.issueChallan = async (req, res, next) => {
  try {
    const {
      registration_no,
      violation_type,
      description,
      location,
      latitude,
      longitude,
      amount,
      evidence_url,
      due_days = 30,
    } = req.body;

    // Lookup vehicle and owner
    const [veh] = await pool.query(
      "SELECT id, owner_id FROM vehicles WHERE registration_no = ?",
      [registration_no]
    );
    const vehicle_id = veh[0]?.id || null;
    const citizen_id = veh[0]?.owner_id || null;
    const challan_no = `CH${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Number(due_days));
    const dueDateStr = dueDate.toISOString().split("T")[0];

    const [result] = await pool.query(
      `INSERT INTO challans
        (challan_no, vehicle_id, registration_no, citizen_id, officer_id,
         violation_type, description, location, latitude, longitude,
         amount, evidence_url, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        challan_no, vehicle_id, registration_no, citizen_id, req.user.id,
        violation_type, description || null, location || null,
        latitude || null, longitude || null, amount,
        evidence_url || null, dueDateStr,
      ]
    );

    logger.info("Challan issued", {
      challanId: result.insertId,
      challan_no,
      officerId: req.user.id,
      registration_no,
    });

    res.status(201).json({
      success: true,
      message: "Challan issued successfully",
      challan: {
        id: result.insertId,
        challan_no,
        registration_no,
        violation_type,
        amount,
        due_date: dueDateStr,
        status: "pending",
      },
    });
  } catch (err) { next(err); }
};

// CITIZEN: dispute a challan
exports.disputeChallan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid reason (min 10 characters)",
      });
    }

    const [rows] = await pool.query("SELECT * FROM challans WHERE id = ?", [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Challan not found" });
    }

    const challan = rows[0];
    if (challan.citizen_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    if (challan.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending challans can be disputed",
      });
    }

    await pool.query(
      `UPDATE challans SET status='disputed', description = CONCAT(COALESCE(description,''), '\n[DISPUTE]: ', ?) WHERE id = ?`,
      [reason, id]
    );

    logger.info("Challan disputed", { challanId: id, userId: req.user.id });
    res.json({ success: true, message: "Dispute submitted successfully" });
  } catch (err) { next(err); }
};

// ADMIN/OFFICER: cancel a challan
exports.cancelChallan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const [rows] = await pool.query("SELECT * FROM challans WHERE id = ?", [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Challan not found" });
    }

    // Officers can only cancel their own; admins can cancel any
    if (req.user.role === "officer" && rows[0].officer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Cannot cancel another officer's challan",
      });
    }

    await pool.query(
      `UPDATE challans SET status='cancelled',
         description = CONCAT(COALESCE(description,''), '\n[CANCELLED]: ', ?)
       WHERE id = ?`,
      [reason || "No reason provided", id]
    );

    logger.info("Challan cancelled", { challanId: id, by: req.user.id });
    res.json({ success: true, message: "Challan cancelled" });
  } catch (err) { next(err); }
};

// Get all challans (admin/officer) with filters
exports.getAllChallans = async (req, res, next) => {
  try {
    const {
      status, violation_type, registration_no,
      from, to, page = 1, limit = 20,
    } = req.query;

    const offset = (page - 1) * limit;
    const params = [];
    let where = "WHERE 1=1";

    if (status)          { where += " AND c.status = ?";          params.push(status); }
    if (violation_type)  { where += " AND c.violation_type = ?";  params.push(violation_type); }
    if (registration_no) { where += " AND c.registration_no = ?"; params.push(registration_no); }
    if (from)            { where += " AND DATE(c.issued_at) >= ?"; params.push(from); }
    if (to)              { where += " AND DATE(c.issued_at) <= ?"; params.push(to); }

    const [rows] = await pool.query(
      `SELECT c.*, u.name AS citizen_name, o.name AS officer_name
       FROM challans c
       LEFT JOIN users u ON c.citizen_id = u.id
       LEFT JOIN users o ON c.officer_id = o.id
       ${where} ORDER BY c.issued_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    const [[count]] = await pool.query(
      `SELECT COUNT(*) AS total FROM challans c ${where}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      pagination: { total: count.total, page: +page, limit: +limit },
    });
  } catch (err) { next(err); }
};

// Search challan by challan_no or registration_no (public lookup)
exports.searchChallan = async (req, res, next) => {
  try {
    const { challan_no, registration_no } = req.query;

    if (!challan_no && !registration_no) {
      return res.status(400).json({
        success: false,
        message: "Provide challan_no or registration_no",
      });
    }

    let query = "SELECT * FROM challans WHERE 1=1";
    const params = [];
    if (challan_no)      { query += " AND challan_no = ?";      params.push(challan_no); }
    if (registration_no) { query += " AND registration_no = ?"; params.push(registration_no); }
    query += " ORDER BY issued_at DESC LIMIT 50";

    const [rows] = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) { next(err); }
};

