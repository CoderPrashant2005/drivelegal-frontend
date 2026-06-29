const express = require("express");
const router  = express.Router();
const { authenticate, authenticateAdmin } = require("../middleware/auth");
const { handleEvidenceImage } = require("../middleware/upload");
const ctrl = require("../controllers/violationController");

router.get("/vehicle-lookup", authenticateAdmin, ctrl.vehicleLookup);  // Officer
router.post("/",              authenticateAdmin, handleEvidenceImage, ctrl.submitViolation); // Officer submit
router.get("/my",             authenticateAdmin, ctrl.getMyViolations); // Officer history
router.get("/pending",        authenticateAdmin, ctrl.getPendingViolations); // Analyst
router.patch("/:id/approve",  authenticateAdmin, ctrl.approveViolation);    // Analyst
router.patch("/:id/reject",   authenticateAdmin, ctrl.rejectViolation);     // Analyst
router.get("/mine",           authenticate,      ctrl.getMyChallans);       // User

module.exports = router;
// In app.js add: app.use("/api/violations", require("./routes/violation.routes"));

// Also add this to your existing vehicle routes or auth routes:
// GET /api/vehicles/mine  → returns logged-in user's vehicles
// Add in your vehicle controller:
//
// exports.getMyVehicles = async (req, res, next) => {
//   try {
//     const [rows] = await pool.query(
//       "SELECT vehicle_id, vehicle_number, vehicle_type FROM vehicles WHERE user_id = ?",
//       [req.user.id]
//     );
//     res.json({ success: true, vehicles: rows });
//   } catch (err) { next(err); }
// };