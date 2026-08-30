import { Request, Response, NextFunction } from "express";
import { tokenService } from "../services/tokenService.js";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      data: null,
      error: {
        code: "UNAUTHORIZED",
        message: "Authorization header missing or invalid",
      },
      meta: { timestamp: new Date().toISOString() },
    });
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  try {
    const payload = tokenService.verify(token);
    (req as any).user = payload;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      data: null,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      },
      meta: { timestamp: new Date().toISOString() },
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        data: null,
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
        meta: { timestamp: new Date().toISOString() },
      });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: "FORBIDDEN", message: "Insufficient permissions" },
        meta: { timestamp: new Date().toISOString() },
      });
    }

    next();
  };
};
