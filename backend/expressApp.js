const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const env = require("./config/env");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const logger = require("./utils/logger");
require("./config/db");

const authRoutes     = require("./routes/auth.routes");
const challanRoutes  = require("./routes/challan.routes");
const officerRoutes  = require("./routes/officer.routes");
const locationRoutes = require("./routes/location.routes");
const chatbotRoutes  = require("./routes/chatbot.routes");
const violationRoutes = require("./routes/violation.routes");
const contactRoutes = require("./routes/contact.route"); 
const supportRoutes = require("./routes/support.routes");
const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: env.clientUrl }));
app.use(express.json());
app.use(morgan("dev"));


// Serve uploaded evidence images (e.g. /uploads/violations/xyz.jpg)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: "Too many requests from this IP, please try again after 15 minutes",
  skip: () => env.nodeEnv !== "production",
});

app.use("/api/", apiLimiter);
app.get("/", (req, res) => res.send("Welcome to DriveLegal Backend API!"));
app.use("/api/auth",       authRoutes);
app.use("/api/challans",   challanRoutes);
app.use("/api/officer",    officerRoutes);
app.use("/api/location",   locationRoutes);
app.use("/api/chatbot",    chatbotRoutes);
app.use("/api/violations", violationRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/support", supportRoutes);
app.use(notFound);
app.use(errorHandler);
module.exports = app;