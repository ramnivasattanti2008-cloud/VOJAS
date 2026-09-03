import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps an async Express route handler so unhandled promise rejections
 * are forwarded to the error handler via next(err) instead of crashing the process.
 * Express 4's error handler only catches synchronous errors natively.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
