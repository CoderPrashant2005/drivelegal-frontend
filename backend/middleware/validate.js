const { body, param, query, validationResult } = require("express-validator");

exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

exports.rules = {
  register: [
    body("full_name").notEmpty().withMessage("Full name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  login: [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  issueChallan: [
    body("registration_no").notEmpty().withMessage("Registration number is required"),
    body("violation_type").notEmpty().withMessage("Violation type is required"),
    body("amount").isNumeric().withMessage("Amount must be a number"),
  ],
  idParam: [
    param("id").isInt().withMessage("Invalid ID"),
  ],
  pagination: [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  chatbotAsk: [
    body("question").notEmpty().withMessage("Question is required"),
  ],
  createLocationRule: [
    body("area_name").notEmpty().withMessage("Area name is required"),
    body("city").notEmpty().withMessage("City is required"),
    body("state").notEmpty().withMessage("State is required"),
  ],
};