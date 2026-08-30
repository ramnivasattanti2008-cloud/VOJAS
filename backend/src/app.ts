import express from "express";
import cors from "cors";
import { config } from "./config/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import routes from "./routes/index.js";
import { logger } from "./utils/logger.js";

const app = express();

// Middleware
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`, {
    query: req.query,
    ip: req.ip,
  });
  next();
});

// API routes
app.use(`/api/${config.apiVersion}`, routes);

// Root endpoint
app.get("/", (_req, res) => {
  res.json({
    message: "VOJAS API",
    version: "1.0.0",
    docs: "/api/v1/health",
  });
});

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
