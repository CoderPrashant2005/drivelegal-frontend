const express  = require("express");
const router   = express.Router();

const { authenticate, authenticateAdmin } = require("../middleware/auth");
const { validate, rules }                 = require("../middleware/validate");
const ctrl                                = require("../controllers/authController");

// ─────────────────────────────────────────────────────────────────────────────
//  Mount this entire file at /api/auth in app.js:
//
//    const authRoutes = require("./routes/auth.routes");
//    app.use("/api/auth", authRoutes);
//
//  That gives you:
//    POST   /api/auth/login
//    POST   /api/auth/register
//    POST   /api/auth/refresh
//    POST   /api/auth/logout
//    GET    /api/auth/me
//    GET    /api/auth/admin/me
//    POST   /api/auth/admin/staff
//    GET    /api/auth/admin/staff
//    PATCH  /api/auth/admin/staff/:id/toggle
//    DELETE /api/auth/admin/staff/:id
//    POST   /api/auth/forgot-password
//    POST   /api/auth/reset-password
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
//  RUN THESE ONCE IN MYSQL BEFORE USING FORGOT/RESET PASSWORD:
//
//  ALTER TABLE users
//    ADD COLUMN reset_token     VARCHAR(64) DEFAULT NULL,
//    ADD COLUMN reset_token_exp DATETIME    DEFAULT NULL;
//
//  ALTER TABLE admins
//    ADD COLUMN reset_token     VARCHAR(64) DEFAULT NULL,
//    ADD COLUMN reset_token_exp DATETIME    DEFAULT NULL;
// ─────────────────────────────────────────────────────────────────────────────


// ── Public (no token needed) ──────────────────────────────────────────────────
router.post("/login",    rules.login,    validate, ctrl.login);    // citizens + admins unified
router.post("/register", rules.register, validate, ctrl.register); // citizens only
router.post("/refresh",                            ctrl.refresh);  // citizens + admins unified


// ── Citizen-protected (any valid JWT) ─────────────────────────────────────────
router.get( "/me",     authenticate, ctrl.me);
router.post("/logout", authenticate, ctrl.logout);


// ── User vehicles ─────────────────────────────────────────────────────────────
router.get("/vehicles/mine", authenticate, async (req, res) => {
  try {
    const pool = require("../config/db");
    const [rows] = await pool.query(
      "SELECT vehicle_id, vehicle_number, vehicle_type FROM vehicles WHERE user_id = ?",
      [req.user.id]
    );
    res.json({ success: true, vehicles: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ── Admin-protected (valid JWT + admin role) ──────────────────────────────────
router.get(   "/admin/me",               authenticateAdmin, ctrl.adminMe);
router.post(  "/admin/staff",            authenticateAdmin, ctrl.adminRegisterStaff);
router.get(   "/admin/staff",            authenticateAdmin, ctrl.getStaff);
router.patch( "/admin/staff/:id/toggle", authenticateAdmin, ctrl.toggleStaffStatus);
router.delete("/admin/staff/:id",        authenticateAdmin, ctrl.deleteStaff);


// ── Forgot / Reset Password ───────────────────────────────────────────────────
const crypto     = require("crypto");
const nodemailer = require("nodemailer");
const pool       = require("../config/db");

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const normalizedEmail = email.trim().toLowerCase();

    // Check both users and admins tables
    const [userRows]  = await pool.query("SELECT user_id  FROM users  WHERE email = ?", [normalizedEmail]);
    const [adminRows] = await pool.query("SELECT admin_id FROM admins WHERE email = ?", [normalizedEmail]);

    const userExists = userRows.length > 0 || adminRows.length > 0;

    if (userExists) {
      const token     = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes from now

      // Save token directly into whichever table has this email
      // (both queries run; only the matching one will update a row)
      await pool.query(
        "UPDATE users  SET reset_token = ?, reset_token_exp = ? WHERE email = ?",
        [token, expiresAt, normalizedEmail]
      );
      await pool.query(
        "UPDATE admins SET reset_token = ?, reset_token_exp = ? WHERE email = ?",
        [token, expiresAt, normalizedEmail]
      );

      // Change this to your actual frontend URL when deployed
      const resetUrl = `http://localhost:3000/reset-password?token=${token}`;

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from:    `"DriveLegal" <${process.env.SMTP_USER}>`,
        to:      normalizedEmail,
        subject: "Reset your DriveLegal password",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;">
            <h2 style="color:#2C1A10;">Password Reset Request</h2>
            <p>Click the button below to reset your password. This link expires in <strong>30 minutes</strong>.</p>
            <a href="${resetUrl}" style="
              display:inline-block;padding:12px 28px;
              background:#2C1A10;color:#fff;
              border-radius:8px;text-decoration:none;
              font-weight:bold;font-size:15px;margin:16px 0;
            ">Reset Password</a>
            <p style="font-size:12px;color:#888;margin-top:24px;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        `,
      });
    }

    // Always return 200 — never reveal whether the email exists (security)
    return res.json({ message: "If that email is registered, a reset link has been sent." });

  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});


// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    return res.status(400).json({ message: "Token and new password are required." });

  try {
    // Look up token in both tables — whichever has it and it hasn't expired
    const [userRows]  = await pool.query(
      "SELECT email FROM users  WHERE reset_token = ? AND reset_token_exp > NOW()",
      [token]
    );
    const [adminRows] = await pool.query(
      "SELECT email FROM admins WHERE reset_token = ? AND reset_token_exp > NOW()",
      [token]
    );

    const found = userRows[0] || adminRows[0];
    if (!found)
      return res.status(400).json({ message: "Reset link is invalid or has expired." });

    // Only touch the table where this token actually matched — never both,
    // since duplicate emails across users/admins are otherwise possible.
    const table = userRows.length ? "users" : "admins";
    const { email } = found;

    const bcrypt = require("bcryptjs");
    const hashed = await bcrypt.hash(newPassword, 12);

    const updateQuery = table === "users"
      ? "UPDATE users  SET password_hash = ?, reset_token = NULL, reset_token_exp = NULL WHERE email = ?"
      : "UPDATE admins SET password_hash = ?, reset_token = NULL, reset_token_exp = NULL WHERE email = ?";

    await pool.query(updateQuery, [hashed, email]);

    return res.json({ message: "Password reset successfully. You can now log in." });

  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});


module.exports = router;


// ─────────────────────────────────────────────────────────────────────────────
//  ADD TO middleware/auth.js
// ─────────────────────────────────────────────────────────────────────────────
//
//  exports.authenticateAdmin = (req, res, next) => {
//    authenticate(req, res, (err) => {
//      if (err) return next(err);
//      const adminRoles = ["rto_chief", "rto_officer", "analyst"];
//      if (!adminRoles.includes(req.user?.role))
//        return res.status(403).json({ success: false, message: "Admin access required" });
//      next();
//    });
//  };
//
// ─────────────────────────────────────────────────────────────────────────────
//  MySQL — run once if not done yet
// ─────────────────────────────────────────────────────────────────────────────
//
//  CREATE TABLE IF NOT EXISTS admins (
//    admin_id      INT AUTO_INCREMENT PRIMARY KEY,
//    full_name     VARCHAR(100) NOT NULL,
//    email         VARCHAR(150) NOT NULL UNIQUE,
//    phone_number  VARCHAR(15),
//    password_hash VARCHAR(255) NOT NULL,
//    role          ENUM('rto_chief','rto_officer','analyst') NOT NULL,
//    area          VARCHAR(100),
//    disabled      TINYINT(1) NOT NULL DEFAULT 0,
//    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//  );
//
//  -- Seed your RTO Chief (replace the hash with a real bcrypt hash):
//  INSERT INTO admins (full_name, email, phone_number, password_hash, role)
//  VALUES ('Chief Name', 'chief@rto.gov.in', '9999999999', '<bcrypt_hash>', 'rto_chief');