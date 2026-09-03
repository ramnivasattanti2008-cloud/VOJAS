import { describe, it, expect } from 'vitest';
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  InternalServerError,
} from '../src/errors/index.js';

describe('AppError hierarchy', () => {
  it('NotFoundError has statusCode 404 and code NOT_FOUND', () => {
    const err = new NotFoundError('Project not found: abc');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Project not found: abc');
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(NotFoundError);
  });

  it('UnauthorizedError has statusCode 401', () => {
    const err = new UnauthorizedError('Token expired');
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('ForbiddenError has statusCode 403', () => {
    const err = new ForbiddenError('cannot delete project');
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('ValidationError has statusCode 400 and accepts details', () => {
    const err = new ValidationError('Invalid input', { field: 'email' });
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual({ field: 'email' });
  });

  it('ConflictError has statusCode 409', () => {
    const err = new ConflictError('Resource already exists');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });

  it('InternalServerError has statusCode 500', () => {
    const err = new InternalServerError('Database connection failed');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
  });

  it('toJSON returns correct shape', () => {
    const err = new ValidationError('Bad data', { fields: ['email', 'name'] });
    const json = err.toJSON();
    expect(json).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Bad data',
        details: { fields: ['email', 'name'] },
      },
    });
  });

  it('toJSON omits details when not present', () => {
    const err = new NotFoundError('User not found');
    const json = err.toJSON();
    expect(json.error).not.toHaveProperty('details');
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('AppError factory methods create correct subtypes', () => {
    const notFound = AppError.notFound('Project', '123');
    expect(notFound).toBeInstanceOf(NotFoundError);
    expect(notFound.statusCode).toBe(404);

    const unauthorized = AppError.unauthorized('Token invalid');
    expect(unauthorized).toBeInstanceOf(UnauthorizedError);
    expect(unauthorized.statusCode).toBe(401);

    const forbidden = AppError.forbidden('delete');
    expect(forbidden).toBeInstanceOf(ForbiddenError);
    expect(forbidden.statusCode).toBe(403);

    const validation = AppError.validation('Invalid', { foo: 'bar' });
    expect(validation).toBeInstanceOf(ValidationError);
    expect(validation.statusCode).toBe(400);

    const conflict = AppError.conflict('Already exists');
    expect(conflict).toBeInstanceOf(ConflictError);
    expect(conflict.statusCode).toBe(409);

    const internal = AppError.internal();
    expect(internal).toBeInstanceOf(InternalServerError);
    expect(internal.statusCode).toBe(500);
  });

  it('AppError.notFound without id returns entity only', () => {
    const err = AppError.notFound('DataSource');
    expect(err.message).toBe('DataSource not found');
  });

  it('captureStackTrace is called (name property set)', () => {
    const err = new NotFoundError('test');
    expect(err.name).toBe('NotFoundError');
  });
});
