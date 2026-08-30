import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────────────

const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().default(false),
});

const MarkReadSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
});

// ── GET /notifications ──────────────────────────────────────────────────────

export async function listNotifications(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json(errorResponse("UNAUTHORIZED", "Authentication required"));
      return;
    }

    const parsed = PaginationSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json(errorResponse("BAD_REQUEST", parsed.error.message));
      return;
    }

    const { page, limit, unreadOnly } = parsed.data;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (unreadOnly) where.isRead = false;

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    res.json(
      successResponse({
        items,
        total,
        unreadCount,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    );
  } catch (err) {
    next(err);
  }
}

// ── GET /notifications/unread-count ────────────────────────────────────────

export async function unreadCount(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json(errorResponse("UNAUTHORIZED", "Authentication required"));
      return;
    }

    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    res.json(successResponse({ count }));
  } catch (err) {
    next(err);
  }
}

// ── POST /notifications/read ───────────────────────────────────────────────

export async function markRead(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json(errorResponse("UNAUTHORIZED", "Authentication required"));
      return;
    }

    const parsed = MarkReadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(
        errorResponse("BAD_REQUEST", "ids (array of UUID) required", parsed.error.issues)
      );
      return;
    }

    await prisma.notification.updateMany({
      where: {
        id: { in: parsed.data.ids },
        userId, // guard: only own notifications
      },
      data: { isRead: true },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    res.json(
      successResponse({
        markedCount: parsed.data.ids.length,
        unreadCount,
      })
    );
  } catch (err) {
    next(err);
  }
}

// ── POST /notifications/read-all ───────────────────────────────────────────

export async function markAllRead(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json(errorResponse("UNAUTHORIZED", "Authentication required"));
      return;
    }

    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    res.json(successResponse({ markedCount: result.count }));
  } catch (err) {
    next(err);
  }
}

// ── DELETE /notifications/:id ──────────────────────────────────────────────

export async function deleteNotification(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json(errorResponse("UNAUTHORIZED", "Authentication required"));
      return;
    }

    const id = req.params.id as string;

    const deleted = await prisma.notification.deleteMany({
      where: { id, userId },
    });

    if (deleted.count === 0) {
      res.status(404).json(errorResponse("NOT_FOUND", "Notification not found"));
      return;
    }

    res.json(successResponse({ success: true }));
  } catch (err) {
    next(err);
  }
}
