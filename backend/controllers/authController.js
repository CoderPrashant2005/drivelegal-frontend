const pool = require("../config/db");
const { hashPassword, comparePassword } = require("../utils/hash");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../utils/jwt");
const { claimVehiclesForUser } = require("./violationController");

// ─────────────────────────────────────────────────────────────────────────────
//  SHARED LOGIN  →  POST /api/auth/login
//
//  Checks admins table first (rto_chief, rto_officer, analyst, super_admin).
//  Falls back to users table (citizen).
//  Returns { role } in the response so the frontend can redirect accordingly.
//
//  Role → suggested frontend redirect:
//    rto_chief    → /admin/chief
//    rto_officer  → /admin/officer
//    analyst      → /admin/analyst
//    user         → /dashboard  (citizen)
// ─────────────────────────────────────────────────────────────────────────────

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // ── 1. Check admins table first ──────────────────────────────────────────
    const [adminRows] = await pool.query(
      "SELECT admin_id, full_name, email, password_hash, designation, is_active FROM admins WHERE email = ?",
      [email]
    );

    if (adminRows.length) {
      const admin = adminRows[0];

      if (!admin.is_active)
        return res.status(403).json({
          success: false,
          message: "Account is disabled. Contact your RTO Chief.",
        });

      const ok = await comparePassword(password, admin.password_hash);
      if (!ok)
        return res.status(401).json({ success: false, message: "Invalid credentials" });

      // normalize DB enum (e.g. 'RTO_CHIEF') → lowercase role string used everywhere else ('rto_chief')
      const role = admin.designation.toLowerCase();

      const payload = {
        id:        admin.admin_id,
        full_name: admin.full_name,
        email:     admin.email,
        role,
      };
      const token        = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);

      return res.json({
        success: true,
        message: "Login successful",
        token,
        refreshToken,
        user: { id: admin.admin_id, full_name: admin.full_name, email: admin.email, role },
      });
    }

    // ── 2. Fall back to citizens (users) table ───────────────────────────────
    const [userRows] = await pool.query(
      "SELECT user_id, full_name, email, password_hash FROM users WHERE email = ?",
      [email]
    );

    if (!userRows.length)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    const user = userRows[0];
    const ok   = await comparePassword(password, user.password_hash);
    if (!ok)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    const payload = {
      id:        user.user_id,
      full_name: user.full_name,
      email:     user.email,
      role:      "user",
    };
    const token        = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return res.json({
      success: true,
      message: "Login successful",
      token,
      refreshToken,
      user: { id: user.user_id, full_name: user.full_name, email: user.email, role: "user" },
    });

  } catch (err) { next(err); }
};


// ─────────────────────────────────────────────────────────────────────────────
//  CITIZEN REGISTER  →  POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────

exports.register = async (req, res, next) => {
  try {
    const { full_name, email, phone_number, password, state, city, licenseplate, vehicles, vehicle_type, model_name } = req.body;

    const [exists] = await pool.query("SELECT user_id FROM users WHERE email = ?", [email]);
    if (exists.length)
      return res.status(409).json({ success: false, message: "Email already registered" });

    // Block cross-table duplicates: this email must not already belong to
    // a staff/admin account, or login() will only ever authenticate the
    // admin side and this citizen account becomes permanently unreachable.
    const [existingAdmin] = await pool.query("SELECT admin_id FROM admins WHERE email = ?", [email]);
    if (existingAdmin.length)
      return res.status(409).json({ success: false, message: "This email is already registered to a staff account. Please use a different email." });

    const hash = await hashPassword(password);

    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, phone_number, password_hash, state, city, license_plate, vehicle_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [full_name, email, phone_number || null, hash, state || null, city || null, licenseplate || null, vehicles || 1]
    );

    // Auto-claim any unclaimed vehicles matching this license plate
    if (licenseplate) await claimVehiclesForUser(result.insertId, licenseplate, vehicle_type, model_name);

    const payload  = { id: result.insertId, full_name, email, role: "user" };
    const token        = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      refreshToken,
      user: { id: result.insertId, full_name, email, role: "user" },
    });
  } catch (err) { next(err); }
};


// ─────────────────────────────────────────────────────────────────────────────
//  REFRESH TOKEN  →  POST /api/auth/refresh
// ─────────────────────────────────────────────────────────────────────────────

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ success: false, message: "Refresh token required" });

    const decoded = verifyRefreshToken(refreshToken);
    const payload = {
      id:        decoded.id,
      full_name: decoded.full_name,
      email:     decoded.email,
      role:      decoded.role,
    };
    const newToken = signAccessToken(payload);

    res.json({ success: true, token: newToken });
  } catch {
    res.status(401).json({ success: false, message: "Invalid refresh token" });
  }
};


// ─────────────────────────────────────────────────────────────────────────────
//  LOGOUT  →  POST /api/auth/logout
//  Works for both citizens and admins — stateless, client clears tokens.
// ─────────────────────────────────────────────────────────────────────────────

exports.logout = (req, res) => {
  res.json({ success: true, message: "Logged out — clear tokens client-side" });
};


// ─────────────────────────────────────────────────────────────────────────────
//  CITIZEN ME  →  GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────

exports.me = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT user_id, full_name, email, phone_number, state, city, profile_photo, created_at
       FROM users WHERE user_id = ?`,
      [req.user.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, user: rows[0] });
  } catch (err) { next(err); }
};


// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN ME  →  GET /api/auth/admin/me
// ─────────────────────────────────────────────────────────────────────────────

exports.adminMe = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT admin_id, full_name, email, phone_number, LOWER(designation) AS role, state, created_at
       FROM admins WHERE admin_id = ?`,
      [req.user.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: "Admin not found" });

    res.json({ success: true, user: rows[0] });
  } catch (err) { next(err); }
};


// ─────────────────────────────────────────────────────────────────────────────
//  STAFF MANAGEMENT  (RTO Chief only)
// ─────────────────────────────────────────────────────────────────────────────

/** POST /api/auth/admin/staff  — create rto_officer or analyst */
exports.adminRegisterStaff = async (req, res, next) => {
  try {
    if (req.user.role !== "rto_chief")
      return res.status(403).json({ success: false, message: "Only RTO Chief can create staff accounts" });

    const { full_name, email, phone_number, password, role, area } = req.body;

   if (!["rto_officer", "analyst", "customer_support"].includes(role))
  return res.status(400).json({ success: false, message: "Role must be rto_officer, analyst, or customer_support" });

    const [exists] = await pool.query("SELECT admin_id FROM admins WHERE email = ?", [email]);
    if (exists.length)
      return res.status(409).json({ success: false, message: "Email already registered" });

    // Block cross-table duplicates the other direction too: this email
    // must not already belong to a citizen account, for the same reason.
    const [existingUser] = await pool.query("SELECT user_id FROM users WHERE email = ?", [email]);
    if (existingUser.length)
      return res.status(409).json({ success: false, message: "This email is already registered as a citizen account. Please use a different email for staff accounts." });

    if (phone_number) {
      const [phoneExists] = await pool.query(
        "SELECT admin_id FROM admins WHERE phone_number = ?",
        [phone_number]
      );
      if (phoneExists.length)
        return res.status(409).json({ success: false, message: "An account with this phone number already exists" });
    }

    const hash = await hashPassword(password);

    // designation enum stores UPPERCASE values, frontend/role checks use lowercase
    const [result] = await pool.query(
      `INSERT INTO admins (full_name, email, phone_number, password_hash, designation, state)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [full_name, email, phone_number || null, hash, role.toUpperCase(), area || null]
    );

    res.status(201).json({
      success: true,
      message: `Staff account created for ${email}`,
      staff: {
        id:           result.insertId,
        full_name,
        email,
        phone_number: phone_number || null,
        role,
        area:         area || null,
        disabled:     false,
      },
    });
  } catch (err) { next(err); }
};


/** GET /api/auth/admin/staff  — list all officers + analysts */
exports.getStaff = async (req, res, next) => {
  try {
    if (req.user.role !== "rto_chief")
      return res.status(403).json({ success: false, message: "Forbidden" });

    const [rows] = await pool.query(
      `SELECT admin_id AS id, full_name, email, phone_number,
              LOWER(designation) AS role, state AS area, is_active, created_at
       FROM admins
       WHERE designation IN ('RTO_OFFICER', 'ANALYST')
       ORDER BY created_at DESC`
    );

    res.json({ success: true, staff: rows });
  } catch (err) { next(err); }
};


/** PATCH /api/auth/admin/staff/:id/toggle  — enable / disable */
exports.toggleStaffStatus = async (req, res, next) => {
  try {
    if (req.user.role !== "rto_chief")
      return res.status(403).json({ success: false, message: "Forbidden" });

    const { id } = req.params;

    const [rows] = await pool.query(
      "SELECT admin_id, is_active FROM admins WHERE admin_id = ? AND designation IN ('RTO_OFFICER','ANALYST')",
      [id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: "Staff member not found" });

    const newActive = rows[0].is_active ? 0 : 1;
    await pool.query("UPDATE admins SET is_active = ? WHERE admin_id = ?", [newActive, id]);

    res.json({
      success:  true,
      id:       Number(id),
      disabled: !newActive,
      message:  newActive ? "Account enabled" : "Account disabled",
    });
  } catch (err) { next(err); }
};


/** DELETE /api/auth/admin/staff/:id  — permanently remove */
exports.deleteStaff = async (req, res, next) => {
  try {
    if (req.user.role !== "rto_chief")
      return res.status(403).json({ success: false, message: "Forbidden" });

    const { id } = req.params;

    const [result] = await pool.query(
      "DELETE FROM admins WHERE admin_id = ? AND designation IN ('RTO_OFFICER','ANALYST')",
      [id]
    );
    if (!result.affectedRows)
      return res.status(404).json({ success: false, message: "Staff member not found" });

    res.json({ success: true, message: "Staff account deleted" });
  } catch (err) { next(err); }
};