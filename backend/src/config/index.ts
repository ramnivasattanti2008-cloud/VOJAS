import dotenv from "dotenv";

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || "development";
const JWT_SECRET = process.env.JWT_SECRET;

// In production, refuse to boot without a real JWT secret.
// The dev default is intentionally weak but at least named so it's obvious.
if (NODE_ENV === "production" && (!JWT_SECRET || JWT_SECRET.length < 32)) {
  throw new Error(
    "FATAL: NODE_ENV=production requires a JWT_SECRET env var of at least 32 characters."
  );
}

export const config = {
  env: NODE_ENV,
  isProduction: NODE_ENV === "production",
  port: parseInt(process.env.PORT || "5000", 10),
  apiVersion: "v1",
  jwt: {
    secret: JWT_SECRET || "vojas-dev-secret-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    algorithm: "HS256" as const,
  },
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || "10", 10),
  },
  clientUrl: process.env.CLIENT_BASE_URL || "http://localhost:5173",
  // httpOnly cookie settings for browser-based auth (XSS-safe — token never accessible to JS)
  cookie: {
    name: process.env.JWT_COOKIE_NAME || "vojas_token",
    secure: NODE_ENV === "production",    // HTTPS-only in production
    httpOnly: true,                        // JS cannot read this cookie
    sameSite: "strict" as const,          // CSRF protection
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,  // 7 days — matches JWT expiry default
  },
  // Rate limit knobs
  rateLimit: {
    authWindowMs: 60 * 1000,        // 1 minute
    authMax: 1000,                  // 1000 / window per IP for /auth (dev only)
    apiWindowMs: 60 * 1000,         // 1 minute
    apiMax: 2000,                   // 2000 req / min / IP for general API (dev only)
  },
};
