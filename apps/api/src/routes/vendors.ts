import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import { AuditService, NotFoundError, ValidationError, vendorListSchema, vendorCreateSchema } from '@vojas/domain';
import { AuditAction, UserRole } from '@vojas/shared';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../auth/rbac';
import { success, created } from '../utils/apiResponse';

const router = Router();
const auditService = new AuditService(prisma);

function normalize(str: string): string {
  return str.toUpperCase().replace(/\s+/g, ' ').trim();
}

/**
 * GET /vendors — list
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = vendorListSchema.safeParse(req.query);
    if (!parsed.success) throw new ValidationError('Invalid query parameters', parsed.error.errors);

    const f = parsed.data;
    const where: Record<string, unknown> = {};
    if (f.state) where.state = f.state;
    if (f.status) where.status = f.status;
    if (f.search) {
      where.OR = [
        { name: { contains: f.search, mode: 'insensitive' } },
        { nameNormalized: { contains: f.search.toUpperCase(), mode: 'insensitive' } },
      ];
    }

    const [data, total] = await prisma.$transaction([
      prisma.vendor.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (f.page - 1) * f.limit,
        take: f.limit,
        include: { _count: { select: { projects: true } } },
      }),
      prisma.vendor.count({ where }),
    ]);

    success(res, { data, total, page: f.page, limit: f.limit, totalPages: Math.ceil(total / f.limit) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /vendors/:id
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        _count: { select: { projects: true } },
        projects: {
          select: { id: true, name: true, state: true, district: true, status: true },
          take: 20,
        },
      },
    });
    if (!vendor) throw new NotFoundError('Vendor');
    success(res, vendor);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /vendors — ADMIN only
 */
router.post(
  '/',
  authenticate,
  requireRole(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = vendorCreateSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid vendor data', parsed.error.errors);

      // Check for duplicate
      const existing = await prisma.vendor.findUnique({
        where: { nameNormalized: normalize(parsed.data.name) },
      });
      if (existing) {
        throw new ValidationError('A vendor with this name already exists');
      }

      const vendor = await prisma.vendor.create({
        data: {
          name: parsed.data.name,
          nameNormalized: normalize(parsed.data.name),
          udyamRegNo: parsed.data.udyamRegNo ?? null,
          pan: parsed.data.pan ?? null,
          gstin: parsed.data.gstin ?? null,
          district: parsed.data.district ?? null,
          state: parsed.data.state ?? null,
          contactEmail: parsed.data.contactEmail ?? null,
          contactPhone: parsed.data.contactPhone ?? null,
        },
      });

      await auditService.logEvent({
        actorId: req.user!.userId,
        actorType: 'USER',
        action: AuditAction.VENDOR_REGISTERED,
        entityType: 'Vendor',
        entityId: vendor.id,
        metadata: { name: vendor.name },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      created(res, vendor);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
