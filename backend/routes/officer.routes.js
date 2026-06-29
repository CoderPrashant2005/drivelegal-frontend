const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { validate, rules } = require("../middleware/validate");
const officerController = require("../controllers/officerController");
const router = express.Router();

router.get("/dashboard", authenticate, authorize("officer"), officerController.getDashboard);
router.get("/verify-vehicle/:registration_no", authenticate, authorize("officer"), officerController.verifyVehicle);
router.get("/my-challans", authenticate, authorize("officer"), rules.pagination, validate, officerController.getMyIssuedChallans);
router.get("/daily-report", authenticate, authorize("officer"), officerController.getDailyReport);
router.put("/challan/:id", authenticate, authorize("officer"), rules.idParam, validate, officerController.updateChallan);

module.exports = router;