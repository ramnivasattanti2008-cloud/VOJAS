import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import { NotFoundError, ValidationError, notificationListSchema, markReadSchema } from '@vojas/domain';
import { authenticate } from '../middleware/auth';
import { success } from '../utils/apiResponse';

const router = Router();

/**
 * GET /notifications — current user's notifications
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = notificationListSchema.safeParse(req.query);
    if (!parsed.success) throw new ValidationError('Invalid query parameters', parsed.error.errors);

    const f = parsed.data;
    const where: Record<string, unknown> = { userId: req.user!.userId };
    if (f.isRead !== undefined) where.isRead = f.isRead;
    if (f.type) where.type = f.type;

    const [data, total, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (f.page - 1) * f.limit,
        take: f.limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user!.userId, isRead: false } }),
    ]);

    success(res, { data, total, unreadCount, page: f.page, limit: f.limit, totalPages: Math.ceil(total / f.limit) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /notifications/count — unread count
 */
router.get('/count', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.userId, isRead: false },
    });
    success(res, { unreadCount: count });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /notifications/mark-read — mark notifications as read
 */
router.post('/mark-read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = markReadSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid request', parsed.error.errors);

    await prisma.notification.updateMany({
      where: {
        id: { in: parsed.data.notificationIds },
        userId: req.user!.userId,
      },
      data: { isRead: true, readAt: new Date() },
    });

    success(res, { updated: parsed.data.notificationIds.length });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /notifications/mark-all-read — mark all as read
 */
router.post('/mark-all-read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    success(res, { updated: result.count });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /notifications/:id — delete a notification
 */
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundError('Notification');
    if (notification.userId !== req.user!.userId) {
      throw new NotFoundError('Notification');
    }
    await prisma.notification.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
