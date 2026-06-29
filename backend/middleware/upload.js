// middleware/upload.js
// Handles multipart/form-data for violation evidence images.
// Saves files to disk under /uploads/violations and exposes the
// resulting path on req.body.evidence_image so the controller can
// treat it exactly like a plain string field.

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "violations");

// Ensure the folder exists before multer tries to write into it
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

function imageFileFilter(req, file, cb) {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed for evidence_image"));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB cap
});

// Middleware: accepts a single file under the form field name "evidence_image",
// then rewrites req.body.evidence_image to the public URL path the rest of
// the app already expects as a plain string.
function handleEvidenceImage(req, res, next) {
  upload.single("evidence_image")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (req.file) {
      // Store a path relative to the served /uploads static route.
      // e.g. /uploads/violations/171234567-9876.jpg
      req.body.evidence_image = `/uploads/violations/${req.file.filename}`;
    }
    next();
  });
}

module.exports = { handleEvidenceImage };
