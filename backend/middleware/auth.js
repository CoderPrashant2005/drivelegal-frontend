const { verifyAccessToken } = require("../utils/jwt");

exports.authenticate = (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Missing token" });
    }
    const token = header.split(" ")[1];
    const decoded = verifyAccessToken(token);
    req.user = decoded; // { id, role, name, email }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: "Forbidden — insufficient role" });
  }
  next();
};
exports.authenticateAdmin = (req, res, next) => {
  exports.authenticate(req, res, (err) => {
    if (err) return next(err);
    const adminRoles = ["rto_chief", "rto_officer", "analyst", "customer_support"];
    if (!adminRoles.includes(req.user?.role))
      return res.status(403).json({ success: false, message: "Admin access required" });
    next();
  });
};