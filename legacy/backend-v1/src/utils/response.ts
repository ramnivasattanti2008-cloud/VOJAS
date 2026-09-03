/**
 * Standard API response helpers
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: any;
  } | null;
  meta: {
    timestamp: string;
  };
}

export const successResponse = <T>(data: T): ApiResponse<T> => ({
  success: true,
  data,
  error: null,
  meta: { timestamp: new Date().toISOString() },
});

export const errorResponse = (
  code: string,
  message: string,
  details?: any
): ApiResponse<null> => ({
  success: false,
  data: null,
  error: { code, message, details },
  meta: { timestamp: new Date().toISOString() },
});
