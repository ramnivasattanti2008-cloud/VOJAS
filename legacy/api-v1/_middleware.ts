import type { VercelRequest, VercelResponse } from "@vercel/node";

// Vercel serverless wrapper for the Express backend.
// Handles CORS preflight and routes all /api/* requests to the Express app.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
    res.status(200).end();
    return;
  }

  // Dynamic import to avoid loading Express on every cold start
  try {
    const { default: expressApp } = await import("../backend/dist/server.js");
    expressApp(req, res);
  } catch {
    res.status(503).json({
      success: false,
      error: { code: "SERVER_INIT_ERROR", message: "Server is starting up, please retry." }
    });
  }
}
