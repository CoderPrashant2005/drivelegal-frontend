const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { validate, rules } = require("../middleware/validate");
const challanController = require("../controllers/challanController");
const router = express.Router();

router.get("/my", authenticate, authorize("citizen"), rules.pagination, validate, challanController.getMyChallans);
router.get("/search", challanController.searchChallan);
router.get("/:id", authenticate, rules.idParam, validate, challanController.getChallanById);
router.post("/issue", authenticate, authorize("officer"), rules.issueChallan, validate, challanController.issueChallan);
router.put("/dispute/:id", authenticate, authorize("citizen"), rules.idParam, validate, challanController.disputeChallan);
router.put("/cancel/:id", authenticate, authorize("officer", "admin"), rules.idParam, validate, challanController.cancelChallan);
router.get("/", authenticate, authorize("officer", "admin"), rules.pagination, validate, challanController.getAllChallans);

module.exports = router;