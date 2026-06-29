exports.notFound = (req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });

exports.errorHandler = (err, req, res, next) => {
  console.error("🔥 Error:", err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
