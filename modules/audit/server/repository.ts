/**
 * REPOSITORY BOUNDARY RULE:
 * This repository is strictly private to the `audit` module.
 * Other modules MUST NEVER import this repository directly.
 * Instead, call the exposed methods in `modules/audit/server/service.ts` or procedures.
 */
import { db } from "@/prisma/db";

export interface AuditLogRecord {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string;
  previousState: unknown;
  newState: unknown;
  ipAddress: string | null;
  requestId: string | null;
  createdAt: string;
}

export interface RecordEventInput {
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string;
  previousState?: unknown;
  newState?: unknown;
  ipAddress?: string | null;
  requestId?: string | null;
}

export const auditRepository = {
  async recordEvent(data: RecordEventInput): Promise<AuditLogRecord> {
    return db.orm.public.AuditLog.create({
      actorId: data.actorId,
      actorRole: data.actorRole,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      previousState: (data.previousState ?? null) as never,
      newState: (data.newState ?? null) as never,
      ipAddress: data.ipAddress ?? null,
      requestId: data.requestId ?? null,
    });
  },

  async listEvents(filter: {
    entityType?: string;
    entityId?: string;
    actorId?: string;
    action?: string;
    offset: number;
    limit: number;
  }): Promise<{ items: AuditLogRecord[]; total: number }> {
    let query = db.orm.public.AuditLog;
    if (filter.entityType) query = query.where({ entityType: filter.entityType });
    if (filter.entityId) query = query.where({ entityId: filter.entityId });
    if (filter.actorId) query = query.where({ actorId: filter.actorId });
    if (filter.action) query = query.where({ action: filter.action });

    const [items, totals] = await Promise.all([
      query.orderBy((a) => a.createdAt.desc()).offset(filter.offset).limit(filter.limit).all(),
      query.aggregate((agg) => ({ total: agg.count() })),
    ]);
    return { items, total: totals.total };
  },

  async findById(id: string): Promise<AuditLogRecord | null> {
    return db.orm.public.AuditLog.first({ id });
  },
};
