/**
 * Standard API response wrapper helpers.
 *
 * Every successful response uses { success: true, data: T } and every
 * error response uses { success: false, error: { code, message } }.
 */
import type { Response } from 'express';

export function success<T>(res: Response, data: T, statusCode = 200): Response {
  return res.status(statusCode).json({ success: true, data });
}

export function created<T>(res: Response, data: T): Response {
  return success(res, data, 201);
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}

export function error(
  res: Response,
  code: string,
  message: string,
  details?: unknown,
  statusCode = 400,
): Response {
  return res.status(statusCode).json({
    success: false,
    error: { code, message, details },
  });
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
