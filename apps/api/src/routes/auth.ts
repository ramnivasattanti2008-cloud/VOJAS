import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '@vojas/db';
import { AuditService } from '@vojas/domain';
import { registerSchema, loginSchema, refreshTokenSchema } from '@vojas/domain';
import { ValidationError, UnauthorizedError, ConflictError, NotFoundError } from '@vojas/domain';
import { UserRole, AuditAction } from '@vojas/shared';
import { hashPassword, verifyPassword } from '../auth/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../auth/jwt';
import { authenticate } from '../middleware/auth';
import { success, created } from '../utils/apiResponse';
import type { JWTPayload } from '../auth/jwt';

const router = Router();
const auditService = new AuditService(prisma);

/**
 * POST /auth/register — public
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid registration data', parsed.error.errors);
    }

    const { email, password, name, role } = parsed.data;

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictError('User with this email already exists');
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { email, passwordHash, name, role: (role ?? UserRole.VIEWER) as any },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: 'pending', // Will update after creating refresh token
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Create refresh token
    const refreshToken = signRefreshToken(session.id);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash },
    });

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role as unknown as UserRole,
      sessionId: session.id,
    });

    // Audit log
    await auditService.logEvent({
      actorId: user.id,
      actorType: 'USER',
      action: AuditAction.USER_CREATED,
      entityType: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    created(res, {
      user,
      accessToken,
      refreshToken,
      expiresIn: '15m',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/login — public
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid login data', parsed.error.errors);
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      await auditService.logEvent({
        actorId: 'unknown',
        actorType: 'USER',
        action: AuditAction.AUTH_FAILED_LOGIN,
        entityType: 'User',
        entityId: 'unknown',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'user_not_found_or_inactive', attemptedEmail: email },
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await auditService.logEvent({
        actorId: user.id,
        actorType: 'USER',
        action: AuditAction.AUTH_FAILED_LOGIN,
        entityType: 'User',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'invalid_password' },
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip ?? null,
        userAgent: req.headers['user-agent'],
      },
    });

    // Create refresh token
    const refreshToken = signRefreshToken(session.id);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash },
    });

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role as unknown as UserRole,
      sessionId: session.id,
    });

    // Audit log
    await auditService.logEvent({
      actorId: user.id,
      actorType: 'USER',
      action: AuditAction.AUTH_LOGIN,
      entityType: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    success(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as unknown as UserRole,
      },
      accessToken,
      refreshToken,
      expiresIn: '15m',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/refresh — public
 */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = (req.body?.refreshToken as string) || req.cookies?.refreshToken;
    if (!token) {
      throw new ValidationError('Refresh token is required');
    }

    let sessionId: string;
    try {
      const payload = verifyRefreshToken(token);
      sessionId = payload.sessionId;
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session || !session.user.isActive) {
      throw new UnauthorizedError('Session expired or user inactive');
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: sessionId } });
      throw new UnauthorizedError('Session expired');
    }

    // Verify refresh token against stored hash
    const valid = await verifyPassword(token, session.refreshTokenHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const accessToken = signAccessToken({
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role as unknown as UserRole,
      sessionId: session.id,
    });

    await auditService.logEvent({
      actorId: session.user.id,
      actorType: 'USER',
      action: AuditAction.AUTH_TOKEN_REFRESH,
      entityType: 'Session',
      entityId: session.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    success(res, { accessToken, expiresIn: '15m' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/logout — authenticated
 */
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    await auditService.logEvent({
      actorId: user.userId,
      actorType: 'USER',
      action: AuditAction.AUTH_LOGOUT,
      entityType: 'Session',
      entityId: user.sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    await prisma.session.deleteMany({ where: { id: user.sessionId } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * GET /auth/me — authenticated
 */
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!dbUser) {
      throw new NotFoundError('User');
    }

    success(res, dbUser);
  } catch (err) {
    next(err);
  }
});

export default router;
