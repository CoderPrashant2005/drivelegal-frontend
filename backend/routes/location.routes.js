const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { validate, rules } = require("../middleware/validate");
const locationController = require("../controllers/locationController");
const router = express.Router();

router.get("/info", locationController.getLocationInfo);
router.get("/cities", locationController.getCities);
router.post("/rules", authenticate, authorize("admin"), rules.createLocationRule, validate, locationController.createLocationRule);
router.put("/rules/:id", authenticate, authorize("admin"), rules.idParam, rules.createLocationRule, validate, locationController.updateLocationRule);
router.delete("/rules/:id", authenticate, authorize("admin"), rules.idParam, validate, locationController.deleteLocationRule);

module.exports = router;