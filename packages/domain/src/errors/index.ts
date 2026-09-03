/**
 * Typed application errors. All errors extend AppError so they can be caught
 * uniformly by the global error handler.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {})
      }
    };
  }

  static notFound(entity: string, id?: string): NotFoundError {
    return new NotFoundError(id ? `${entity} not found: ${id}` : `${entity} not found`);
  }
  static unauthorized(message = 'Authentication required'): UnauthorizedError {
    return new UnauthorizedError(message);
  }
  static forbidden(action: string): ForbiddenError {
    return new ForbiddenError(`Forbidden: cannot ${action}`);
  }
  static validation(message: string, details?: unknown): ValidationError {
    return new ValidationError(message, details);
  }
  static conflict(message: string): ConflictError {
    return new ConflictError(message);
  }
  static internal(message = 'Internal server error'): InternalServerError {
    return new InternalServerError(message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) { super(message, 404, 'NOT_FOUND'); }
}
export class UnauthorizedError extends AppError {
  constructor(message: string) { super(message, 401, 'UNAUTHORIZED'); }
}
export class ForbiddenError extends AppError {
  constructor(message: string) { super(message, 403, 'FORBIDDEN'); }
}
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}
export class ConflictError extends AppError {
  constructor(message: string) { super(message, 409, 'CONFLICT'); }
}
export class InternalServerError extends AppError {
  constructor(message: string) { super(message, 500, 'INTERNAL_ERROR'); }
}
