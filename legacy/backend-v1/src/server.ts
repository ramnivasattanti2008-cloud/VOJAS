import * as Sentry from "@sentry/node";
import app from "./app.js";
import { config } from "./config/index.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { logger } from "./utils/logger.js";

// Sentry error monitoring — activates once SENTRY_DSN is set in env.
// Until then, this is a no-op (Sentry checks for DSN before sending).
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: config.env,
  // Sample rate: capture 100% in dev, 10% in prod (free tier = 5K events/month)
  sampleRate: config.env === "development" ? 1.0 : 0.1,
  tracesSampleRate: config.env === "development" ? 1.0 : 0.05,
});

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
