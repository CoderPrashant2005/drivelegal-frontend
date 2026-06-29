// ── Forgot Password Route — add to your Express router (auth.routes.js or similar)
// npm install nodemailer crypto  (crypto is built-in, nodemailer may already be installed)

const crypto    = require("crypto");
const nodemailer = require("nodemailer");
const db        = require("../db");          // your MySQL pool/connection

// In-memory token store (replace with a DB table in production)
// Schema: { [token]: { email, expiresAt } }
const resetTokens = {};

// ── POST /api/auth/forgot-password ──
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    // Check if user exists (don't reveal if not — always return success)
    const [rows] = await db.query("SELECT id FROM users WHERE email = ?", [email.toLowerCase()]);

    if (rows.length > 0) {
      // Generate secure token
      const token     = crypto.randomBytes(32).toString("hex");
      const expiresAt = Date.now() + 1000 * 60 * 30; // 30 minutes
      resetTokens[token] = { email: email.toLowerCase(), expiresAt };

      // Build reset URL — change to your frontend URL
      const resetUrl = `http://localhost:3000/reset-password?token=${token}`;

      // Send email via Nodemailer
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SMTP_USER,   // your Gmail address in .env
          pass: process.env.SMTP_PASS,   // Gmail App Password in .env
        },
      });

      await transporter.sendMail({
        from: `"DriveLegal" <${process.env.SMTP_USER}>`,
        to:   email,
        subject: "Reset your DriveLegal password",
        html: `
          <h2>Password Reset Request</h2>
          <p>Click the link below to reset your password. This link expires in 30 minutes.</p>
          <a href="${resetUrl}" style="
            display:inline-block;padding:12px 24px;
            background:#2C1A10;color:#fff;
            border-radius:8px;text-decoration:none;font-weight:bold;
          ">Reset Password</a>
          <p style="margin-top:16px;font-size:12px;color:#888;">
            If you didn't request this, ignore this email.
          </p>
        `,
      });
    }

    // Always return 200 — never reveal if email exists (security best practice)
    return res.json({ message: "If that email is registered, a reset link has been sent." });

  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

// ── POST /api/auth/reset-password ──
// Called when the user clicks the link and submits a new password
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    return res.status(400).json({ message: "Token and new password are required." });

  const entry = resetTokens[token];
  if (!entry || entry.expiresAt < Date.now())
    return res.status(400).json({ message: "Reset link is invalid or has expired." });

  try {
    const bcrypt = require("bcryptjs");
    const hashed = await bcrypt.hash(newPassword, 12);
    await db.query("UPDATE users SET password = ? WHERE email = ?", [hashed, entry.email]);
    delete resetTokens[token]; // one-time use
    return res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});
