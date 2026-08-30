import { Request, Response } from "express";
import { successResponse } from "../utils/response.js";
import { config } from "../config/index.js";
import fs from "fs";
import path from "path";

const startTime = Date.now();

interface HealthCheck {
  status: "ok" | "degraded";
  checks: {
    database: { status: string; latencyMs: number };
    filesystem: { writable: boolean; uploadDir: string };
  };
  timestamp: string;
  uptime: number;
}

export const getHealth = async (_req: Request, res: Response) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const checks: HealthCheck["checks"] = {
    database: { status: "disconnected", latencyMs: 0 },
    filesystem: { writable: false, uploadDir: "" },
  };
  let overallStatus: "ok" | "degraded" = "ok";

  // Check database connection
  try {
    const dbStart = Date.now();
    const { prisma } = await import("../config/database.js");
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "connected", latencyMs: Date.now() - dbStart };
  } catch {
    checks.database.status = "disconnected";
    overallStatus = "degraded";
  }

  // Check filesystem write access for uploads
  try {
    const uploadDir = path.resolve("uploads");
    const testFile = path.join(uploadDir, ".health-check-tmp");
    fs.writeFileSync(testFile, "ok");
    fs.unlinkSync(testFile);
    checks.filesystem = { writable: true, uploadDir };
  } catch {
    checks.filesystem = { writable: false, uploadDir: path.resolve("uploads") };
    overallStatus = "degraded";
  }

  const payload: HealthCheck = {
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString(),
    uptime,
  };

  const statusCode = overallStatus === "degraded" ? 503 : 200;
  res.status(statusCode).json(
    successResponse({
      status: payload.status,
      service: "VOJAS API",
      version: "1.0.0",
      environment: config.env,
      uptime,
      timestamp: payload.timestamp,
      checks: payload.checks,
    })
  );
};
