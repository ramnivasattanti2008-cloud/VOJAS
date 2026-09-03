import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { config } from "./config/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import routes from "./routes/index.js";
import { logger } from "./utils/logger.js";
import { ensureUploadDirs } from "./utils/storage.js";

const app = express();

// Ensure upload directories exist before serving
ensureUploadDirs();

// ── Security headers ────────────────────────────────────────────────────────────
app.use(
  helmet({
    // Content-Security-Policy: restricts resource loading to reduce XSS and injection risks.
    // - defaultSrc/scriptSrc/styleSrc: self only (frontend bundled; no inline scripts)
    // - imgSrc: self, data URIs, blob URLs, plus Leaflet tile servers (openstreetmap, arcgisonline)
    // - connectSrc: self only (API calls)
    // - fontSrc: self + data URIs (embedded fonts)
    // - objectSrc/frameAncestors: none (no plugins or embedding)
    // - upgradeInsecureRequests: only in production (upgrade HTTP → HTTPS)
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://*.tile.openstreetmap.org",
          "https://server.arcgisonline.com",
          "https://*.arcgisonline.com",
        ],
        connectSrc: [
          "'self'",
          "https://vojas-backend.onrender.com",
          "https://vojas-frontend.vercel.app",
        ],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        ...(config.isProduction ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    // Referrer-Policy: don't leak referrer to external sites
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    // X-Content-Type-Options: nosniff — prevents MIME sniffing attacks
    noSniff: true,
    // X-Frame-Options: DENY — prevents clickjacking via iframes
    frameguard: { action: "deny" },
    // X-XSS-Protection: already deprecated by browsers, but kept for older clients
    xssFilter: true,
    // HSTS: force HTTPS (only in production, and only if served over HTTPS)
    hsts: config.isProduction
      ? {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        }
      : false,
  })
);

// ── CORS ───────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [
      config.clientUrl,
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:5176",
      "http://localhost:4173",
      "https://vojas-frontend.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400, // 24 hours — preflight cache
  })
);

// ── Global rate limit ───────────────────────────────────────────────────────────
app.use(`/api/${config.apiVersion}`, apiLimiter);

// ── Body parsing ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploaded attachments
app.use("/uploads", express.static(path.resolve("uploads")));

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
