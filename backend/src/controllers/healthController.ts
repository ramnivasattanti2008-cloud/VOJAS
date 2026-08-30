import { Request, Response } from "express";
import { successResponse } from "../utils/response";
import { config } from "../config";

const startTime = Date.now();

export const getHealth = async (_req: Request, res: Response) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  // Check database connection (if available)
  let databaseStatus: string = "not_configured";
  try {
    const { prisma } = await import("../config/database.js");
    if (prisma) {
      await prisma.$queryRaw`SELECT 1`;
      databaseStatus = "connected";
    }
  } catch (err) {
    databaseStatus = "disconnected";
  }

  res.json(
    successResponse({
      status: "ok",
      service: "VOJAS API",
      version: "1.0.0",
      environment: config.env,
      uptime,
      database: databaseStatus,
      timestamp: new Date().toISOString(),
    })
  );
};
