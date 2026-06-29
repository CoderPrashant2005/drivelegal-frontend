const express = require("express");
const router  = express.Router();
const nodemailer = require("nodemailer");
const pool    = require("../config/db");
const { authenticate, authorize } = require("../middleware/auth");

// ─── Gmail SMTP Transporter (same creds as contact.route.js) ─────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// GET /api/support/messages
// List all contact form submissions, newest first
router.get("/messages", authenticate, authorize("customer_support", "rto_chief"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, subject, message, status, reply_message, replied_at, created_at
       FROM contact
       ORDER BY created_at DESC`
    );
    res.json({ success: true, messages: rows });
  } catch (err) {
    console.error("Get messages error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// GET /api/support/messages/:id
// Get a single message's full detail
router.get("/messages/:id", authenticate, authorize("customer_support", "rto_chief"), async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM contact WHERE id = ?`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: "Message not found." });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("Get message error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// POST /api/support/messages/:id/reply
// Send a reply email to the customer + store it in the DB
router.post("/messages/:id/reply", authenticate, authorize("customer_support", "rto_chief"), async (req, res) => {
  const { reply } = req.body;
  if (!reply || !reply.trim())
    return res.status(400).json({ success: false, message: "Reply message is required." });

  try {
    const [rows] = await pool.query(`SELECT * FROM contact WHERE id = ?`, [req.params.id]);
    const msg = rows[0];
    if (!msg) return res.status(404).json({ success: false, message: "Message not found." });

    // 1️⃣ Send the reply email to the customer
    await transporter.sendMail({
      from:    `"Drive Legal Support" <${process.env.SMTP_USER}>`,
      to:      msg.email,
      subject: `Re: ${msg.subject}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="color:#2563eb;">Drive Legal Support</h2>
          <p>Hi <strong>${msg.name}</strong>,</p>
          <p>${reply.trim().replace(/\n/g, "<br/>")}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
          <p style="color:#6b7280;font-size:13px;">Original message: "${msg.message}"</p>
          <p style="color:#6b7280;font-size:13px;">Drive Legal | RTO Headquarters, New Delhi – 110001</p>
        </div>
      `,
    });

    // 2️⃣ Save reply in DB
    await pool.query(
      `UPDATE contact
       SET status = 'replied', reply_message = ?, replied_by = ?, replied_at = NOW()
       WHERE id = ?`,
      [reply.trim(), req.user.id, req.params.id]
    );

    res.json({ success: true, message: "Reply sent successfully." });
  } catch (err) {
    console.error("Reply error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

module.exports = router;