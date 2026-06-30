// routes/contact.js
// Express route - POST /api/contact
// Saves to MySQL + sends email via Gmail SMTP

const express     = require("express");
const router      = express.Router();
const nodemailer  = require("nodemailer");
const mysql       = require("mysql2/promise");

// --- MySQL Connection Pool ---
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectTimeout: 10000, // fail fast (10s) instead of hanging for 2 minutes
  ssl: { rejectUnauthorized: false }, // Railway's public proxy requires SSL
});

// One-time check at startup so connection issues show up immediately in logs
pool.getConnection()
  .then(conn => {
    console.log("MySQL connected");
    conn.release();
  })
  .catch(err => {
    console.error("MySQL connection failed:", err.message);
  });

// --- Gmail SMTP Transporter ---
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER, // e.g. drivelegalinfo@gmail.com
    pass: process.env.SMTP_PASS, // Gmail App Password (16 chars)
  },
});

// --- POST /api/contact ---
router.post("/", async (req, res) => {
  const { name, email, subject, message } = req.body;

  // Basic validation
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email address." });
  }

  try {
    // 1. Save to MySQL
    await pool.execute(
      `INSERT INTO contact (name, email, subject, message)
       VALUES (?, ?, ?, ?)`,
      [name.trim(), email.trim().toLowerCase(), subject.trim(), message.trim()]
    );

    // 2. Send confirmation email to the user
    await transporter.sendMail({
      from:    `"Drive Legal Support" <${process.env.SMTP_USER}>`,
      to:      email,
      subject: `We received your message - ${subject}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="color:#2563eb;">Drive Legal - Message Received</h2>
          <p>Hi <strong>${name}</strong>,</p>
          <p>Thank you for contacting us. We've received your message and our team will get back to you within <strong>24 hours</strong>.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
          <p><strong>Your message:</strong></p>
          <blockquote style="background:#f3f4f6;padding:12px 16px;border-left:4px solid #2563eb;border-radius:4px;margin:0;">
            ${message.replace(/\n/g, "<br/>")}
          </blockquote>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
          <p style="color:#6b7280;font-size:13px;">Drive Legal | RTO Headquarters, New Delhi - 110001<br/>Mon-Sat: 9 AM - 6 PM IST</p>
        </div>
      `,
    });

    // 3. Send notification email to admin
    await transporter.sendMail({
      from:    `"Drive Legal Contact Form" <${process.env.SMTP_USER}>`,
      to:      process.env.SMTP_USER,
      replyTo: email,
      subject: `New Contact Form: ${subject}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="color:#2563eb;">New Contact Form Submission</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px;font-weight:bold;width:100px;">Name</td><td style="padding:8px;">${name}</td></tr>
            <tr style="background:#f9fafb;"><td style="padding:8px;font-weight:bold;">Email</td><td style="padding:8px;">${email}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Subject</td><td style="padding:8px;">${subject}</td></tr>
            <tr style="background:#f9fafb;"><td style="padding:8px;font-weight:bold;vertical-align:top;">Message</td>
              <td style="padding:8px;">${message.replace(/\n/g, "<br/>")}</td></tr>
          </table>
        </div>
      `,
    });

    return res.status(200).json({ message: "Message sent successfully!" });

  } catch (err) {
    console.error("Contact route error:", err.message);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
});

module.exports = router;