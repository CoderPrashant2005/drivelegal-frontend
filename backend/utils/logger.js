const fs = require("fs");
const path = require("path");
const LOG_DIR = path.join(__dirname, "../../logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
const levels = { INFO: "INFO", WARN: "WARN", ERROR: "ERROR", DEBUG: "DEBUG" };
const formatMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
};
const writeToFile = (level, formattedMessage) => {
  const date = new Date().toISOString().split("T")[0];
  const filename = level === levels.ERROR ? `error-${date}.log` : `app-${date}.log`;
  const filepath = path.join(LOG_DIR, filename);
  fs.appendFile(filepath, formattedMessage + "\n", err => {
    if (err) console.error("Logger write failed:", err);
  });
};
const log = (level, message, meta) => {
  const formatted = formatMessage(level, message, meta);
  const colors = { INFO: "\x1b[36m", WARN: "\x1b[33m", ERROR: "\x1b[31m", DEBUG: "\x1b[90m" };
  const reset = "\x1b[0m";
  console.log(`${colors[level] || ""}${formatted}${reset}`);
  writeToFile(level, formatted);
};
module.exports = {
  info: (msg, meta) => log(levels.INFO, msg, meta),
  warn: (msg, meta) => log(levels.WARN, msg, meta),
  error: (msg, meta) => log(levels.ERROR, msg, meta),
  debug: (msg, meta) => { if (process.env.NODE_ENV === "development") log(levels.DEBUG, msg, meta); },
};
