import { PrismaClient } from '@vojas/db';
import { ValidationError } from '../errors/index.js';
import { z } from 'zod';
import { AuditAction } from '@vojas/shared';

const logEventSchema = z.object({
  actorId: z.string().min(1, 'actorId is required'),
  actorType: z.string().min(1).default('USER'),
  action: z.nativeEnum(AuditAction),
  entityType: z.string().min(1, 'entityType is required'),
  entityId: z.string().min(1, 'entityId is required'),
  metadata: z.record(z.unknown()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

/**
 * AuditService — STRICTLY APPEND-ONLY.
 *
 * This class intentionally exposes no `update` or `delete` methods.
 * All audit log writes are append-only: once an event is recorded, it cannot
 * be modified or removed. Corrections are new rows (with appropriate metadata),
 * not updates to existing ones.
 */
export class AuditService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Append a new audit event.
   */
  async logEvent(
    params: z.infer<typeof logEventSchema>
  ): Promise<unknown> {
    const parsed = logEventSchema.safeParse(params);
    if (!parsed.success) {
      throw new ValidationError('Invalid audit event', parsed.error.errors);
    }
    const p = parsed.data;
    const metadata: Record<string, unknown> = {};
    if (p.metadata) {
      Object.assign(metadata, p.metadata);
    }
    if (p.userAgent) {
      metadata.userAgent = p.userAgent;
    }
    return this.prisma.auditEvent.create({
      data: {
        actorId: p.actorId,
        actorType: p.actorType,
        action: p.action,
        entityType: p.entityType,
        entityId: p.entityId,
        metadata: Object.keys(metadata).length > 0 ? (metadata as any) : undefined,
        ipAddress: p.ipAddress,
        userAgent: p.userAgent,
      },
    });
  }

  async getEventsForEntity(
    entityType: string,
    entityId: string
  ): Promise<unknown[]> {
    if (!entityType || !entityId) {
      throw new ValidationError('entityType and entityId are required');
    }
    return this.prisma.auditEvent.findMany({
      where: { entityType, entityId },
      orderBy: { timestamp: 'desc' },
    });
  }

  async getEventsByActor(actorId: string, limit = 50): Promise<unknown[]> {
    if (!actorId) throw new ValidationError('actorId is required');
    return this.prisma.auditEvent.findMany({
      where: { actorId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async getEventsByAction(action: AuditAction, limit = 50): Promise<unknown[]> {
    if (!action) throw new ValidationError('action is required');
    return this.prisma.auditEvent.findMany({
      where: { action },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  // Intentionally NO update or delete methods.
  // Audit logs are append-only.
}
