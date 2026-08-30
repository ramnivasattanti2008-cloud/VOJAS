import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { errorResponse } from "../utils/response";
import { logger } from "../utils/logger";

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
