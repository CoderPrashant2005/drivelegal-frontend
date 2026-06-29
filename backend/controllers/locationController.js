const pool = require("../config/db");

exports.getLocationInfo = async (req, res, next) => {
  try {
    const { city, state, latitude, longitude } = req.query;
    let query = "SELECT * FROM location_rules WHERE 1=1";
    const params = [];
    if (city) { query += " AND LOWER(city) = LOWER(?)"; params.push(city); }
    if (state) { query += " AND LOWER(state) = LOWER(?)"; params.push(state); }
    query += " LIMIT 10";
    const [rows] = await pool.query(query, params);

    if (!rows.length) {
      return res.json({
        success: true,
        message: "Using default rules — no specific data for this location",
        rules: {
          area_name: city || "General",
          city: city || "Unknown",
          state: state || "Unknown",
          speed_limit: 60,
          rules: [
            "Wear helmet on two-wheelers",
            "Seatbelt mandatory for car occupants",
            "No mobile phone use while driving",
            "Follow signal lights strictly",
          ],
          penalties: {
            no_helmet: 1000,
            no_seatbelt: 1000,
            mobile_use: 5000,
            signal_jump: 1000,
          },
        },
      });
    }
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.getCities = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT DISTINCT city, state FROM location_rules ORDER BY state, city"
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.createLocationRule = async (req, res, next) => {
  try {
    const { area_name, city, state, speed_limit, rules, penalties } = req.body;
    const [result] = await pool.query(
      `INSERT INTO location_rules (area_name, city, state, speed_limit, rules, penalties) VALUES (?, ?, ?, ?, ?, ?)`,
      [area_name, city, state, speed_limit || null, JSON.stringify(rules || []), JSON.stringify(penalties || {})]
    );
    res.status(201).json({ success: true, message: "Location rule created", id: result.insertId });
  } catch (err) { next(err); }
};

exports.updateLocationRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { area_name, city, state, speed_limit, rules, penalties } = req.body;
    const [result] = await pool.query(
      `UPDATE location_rules SET
        area_name = COALESCE(?, area_name),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        speed_limit = COALESCE(?, speed_limit),
        rules = COALESCE(?, rules),
        penalties = COALESCE(?, penalties)
       WHERE id = ?`,
      [area_name, city, state, speed_limit, rules ? JSON.stringify(rules) : null, penalties ? JSON.stringify(penalties) : null, id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Rule not found" });
    res.json({ success: true, message: "Location rule updated" });
  } catch (err) { next(err); }
};

exports.deleteLocationRule = async (req, res, next) => {
  try {
    const [result] = await pool.query("DELETE FROM location_rules WHERE id = ?", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Rule not found" });
    res.json({ success: true, message: "Rule deleted" });
  } catch (err) { next(err); }
};