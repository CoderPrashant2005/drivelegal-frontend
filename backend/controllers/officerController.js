const pool = require("../config/db");
const logger = require("../utils/logger");

exports.getDashboard = async (req, res, next) => {
  try {
    const officerId = req.user.id;
    const [[stats]] = await pool.query(
      `SELECT
        COUNT(*) AS total_issued,
        SUM(CASE WHEN DATE(issued_at) = CURDATE() THEN 1 ELSE 0 END) AS today_issued,
        SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END) AS paid_count,
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending_count,
        COALESCE(SUM(amount), 0) AS total_amount
       FROM challans WHERE officer_id = ?`,
      [officerId]
    );
    const [recent] = await pool.query(
      `SELECT id, challan_no, registration_no, violation_type, amount, status, issued_at
       FROM challans WHERE officer_id = ? ORDER BY issued_at DESC LIMIT 5`,
      [officerId]
    );
    res.json({ success: true, stats, recent });
  } catch (err) { next(err); }
};

exports.verifyVehicle = async (req, res, next) => {
  try {
    const { registration_no } = req.params;
    const [rows] = await pool.query(
      `SELECT v.*, u.name AS owner_name, u.phone AS owner_phone, u.license_no
       FROM vehicles v
       LEFT JOIN users u ON v.owner_id = u.id
       WHERE v.registration_no = ?`,
      [registration_no]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Vehicle not found in records", registration_no });
    }
    const vehicle = rows[0];
    const today = new Date();
    const insuranceValid = vehicle.insurance_valid_till && new Date(vehicle.insurance_valid_till) >= today;
    const pucValid = vehicle.puc_valid_till && new Date(vehicle.puc_valid_till) >= today;
    const [[pendingChallan]] = await pool.query(
      "SELECT COUNT(*) AS pending FROM challans WHERE vehicle_id = ? AND status = 'pending'",
      [vehicle.id]
    );
    res.json({ success: true, vehicle, verification: { insurance_valid: insuranceValid, puc_valid: pucValid, pending_challans: pendingChallan.pending } });
  } catch (err) { next(err); }
};

exports.getMyIssuedChallans = async (req, res, next) => {
  try {
    const { status, from, to, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [req.user.id];
    let where = "WHERE officer_id = ?";
    if (status) { where += " AND status = ?"; params.push(status); }
    if (from) { where += " AND DATE(issued_at) >= ?"; params.push(from); }
    if (to) { where += " AND DATE(issued_at) <= ?"; params.push(to); }
    const [rows] = await pool.query(
      `SELECT * FROM challans ${where} ORDER BY issued_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    const [[count]] = await pool.query(`SELECT COUNT(*) AS total FROM challans ${where}`, params);
    res.json({ success: true, data: rows, pagination: { total: count.total, page: +page, limit: +limit } });
  } catch (err) { next(err); }
};

exports.getDailyReport = async (req, res, next) => {
  try {
    const { date } = req.query;
    const reportDate = date || new Date().toISOString().split("T")[0];
    const [[summary]] = await pool.query(
      `SELECT COUNT(*) AS total, COALESCE(SUM(amount), 0) AS revenue, COUNT(DISTINCT registration_no) AS unique_vehicles
       FROM challans WHERE officer_id = ? AND DATE(issued_at) = ?`,
      [req.user.id, reportDate]
    );
    const [byType] = await pool.query(
      `SELECT violation_type, COUNT(*) AS count, SUM(amount) AS total_amount
       FROM challans WHERE officer_id = ? AND DATE(issued_at) = ? GROUP BY violation_type`,
      [req.user.id, reportDate]
    );
    res.json({ success: true, date: reportDate, summary, by_violation: byType });
  } catch (err) { next(err); }
};

exports.updateChallan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description, evidence_url, amount } = req.body;
    const [rows] = await pool.query("SELECT officer_id, status FROM challans WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Challan not found" });
    if (rows[0].officer_id !== req.user.id) return res.status(403).json({ success: false, message: "Cannot update another officer's challan" });
    if (rows[0].status !== "pending") return res.status(400).json({ success: false, message: "Only pending challans can be updated" });
    await pool.query(
      `UPDATE challans SET description = COALESCE(?, description), evidence_url = COALESCE(?, evidence_url), amount = COALESCE(?, amount) WHERE id = ?`,
      [description, evidence_url, amount, id]
    );
    logger.info("Challan updated", { challanId: id, officerId: req.user.id });
    res.json({ success: true, message: "Challan updated successfully" });
  } catch (err) { next(err); }
};