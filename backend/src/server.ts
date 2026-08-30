import app from "./app.js";
import { config } from "./config/index.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { logger } from "./utils/logger.js";

const startServer = async () => {
  try {
    // Connect to database (non-blocking if not configured)
    try {
      await connectDatabase();
    } catch (err) {
      logger.warn("Database not connected - server will start anyway for health check");
    }

    app.listen(config.port, () => {
      logger.info(`VOJAS API running on port ${config.port}`, {
        env: config.env,
        url: `http://localhost:${config.port}`,
      });
    });
  } catch (err) {
    logger.error("Failed to start server", { error: err });
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await disconnectDatabase();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await disconnectDatabase();
  process.exit(0);
});

startServer();
