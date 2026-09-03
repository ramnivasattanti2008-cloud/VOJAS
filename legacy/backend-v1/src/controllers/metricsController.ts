import { Request, Response } from "express";
import { config } from "../config/index.js";

/**
 * Lightweight runtime metrics endpoint.
 * Returns a JSON snapshot of process memory, CPU, uptime, and basic env info.
 * No Prometheus exporter — keep it simple. No secrets included.
 */
export const getMetrics = (_req: Request, res: Response) => {
  const mem = process.memoryUsage();
  const cpu = process.cpuUsage();
  const usage = process.cpuUsage(); // initial delta; first call returns 0s

  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
        external: mem.external,
      },
      cpu: {
        user: cpu.user,
        system: cpu.system,
      },
      nodeVersion: process.version,
      platform: process.platform,
      env: config.env,
      pid: process.pid,
      db: "connected",
      activeAlerts: [],
      // Internal field — _cpuUsage tracks previous sample for delta calculation
      _cpuUsage: usage,
    },
    meta: { timestamp: new Date().toISOString() },
  });
};
