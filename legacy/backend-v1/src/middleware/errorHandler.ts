import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import multer from "multer";
import { errorResponse } from "../utils/response.js";
import { logger } from "../utils/logger.js";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "AppError";
  }

  // ── Static factory helpers ────────────────────────────────────────────────
  // Lets call sites use `throw AppError.notFound("X")` instead of
  // `throw new AppError(404, "NOT_FOUND", "X")` — same end behaviour.

  static unauthorized(message = "Authentication required"): AppError {
    return new AppError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "Insufficient permissions"): AppError {
    return new AppError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Resource not found"): AppError {
    return new AppError(404, "NOT_FOUND", message);
  }

  static badRequest(message: string, details?: any): AppError {
    return new AppError(400, "BAD_REQUEST", message, details);
  }

  static conflict(message: string, details?: any): AppError {
    return new AppError(409, "CONFLICT", message, details);
  }
}

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json(
    errorResponse("NOT_FOUND", `Route ${req.method} ${req.path} does not exist`)
  );
};

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Multer upload error (file size, etc.)
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File too large. Maximum size is 10 MB."
        : err.message;
    return res.status(400).json(
      errorResponse("UPLOAD_ERROR", message, { code: err.code, field: err.field })
    );
  }

  // Zod validation error
  if (err instanceof ZodError) {
    return res.status(400).json(
      errorResponse("VALIDATION_ERROR", "Invalid input", err.issues)
    );
  }

  // Custom app error
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(
      errorResponse(err.code, err.message, err.details)
    );
  }

  // Unknown error
  logger.error("Unhandled error", { error: err.message, stack: err.stack });
  res.status(500).json(
    errorResponse("INTERNAL_ERROR", "Internal server error")
  );
};
