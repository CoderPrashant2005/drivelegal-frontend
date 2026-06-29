const app = require("./expressApp");
const env = require("./config/env");
const logger = require("./utils/logger");
const PORT = env.port;
app.listen(PORT, () => {
  logger.info(`Server running in ${env.nodeEnv} mode on port ${PORT}`);
  logger.info(`Client accessible at ${env.clientUrl}`);
  logger.info(`API accessible at http://localhost:${PORT}/api`);
});
