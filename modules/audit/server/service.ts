import { ORPCError } from "@orpc/server";
import { auditRepository, AuditLogRecord } from "./repository";
import {
  ListAuditEventsInput,
  ListAuditEventsOutput,
  GetAuditEventInput,
  AuditEventOutput,
} from "../schema";

function toAuditEventOutput(rec: AuditLogRecord): AuditEventOutput {
  return {
    id: rec.id,
    actorId: rec.actorId,
    actorRole: rec.actorRole,
    action: rec.action,
    entityType: rec.entityType,
    entityId: rec.entityId,
    previousState: rec.previousState,
    newState: rec.newState,
    ipAddress: rec.ipAddress,
    createdAt: rec.createdAt,
  };
}

export const auditService = {
  async recordAuditEvent(data: {
    actorId: string | null;
    actorRole: string | null;
    action: string;
    entityType: string;
    entityId: string;
    previousState?: unknown;
    newState?: unknown;
    ipAddress?: string | null;
    requestId?: string | null;
  }): Promise<void> {
    // SECURITY: callers must pass only safe state — never password hashes,
    // session tokens, object-storage keys, or private evidence.
    await auditRepository.recordEvent(data);
  },

  async listEvents(input: ListAuditEventsInput): Promise<ListAuditEventsOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const { items, total } = await auditRepository.listEvents({
      entityType: input.entityType,
      entityId: input.entityId,
      actorId: input.actorId,
      action: input.action,
      offset: (page - 1) * limit,
      limit,
    });

    return {
      items: items.map(toAuditEventOutput),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
        nextCursor: null,
      },
    };
  },

  async getEvent(input: GetAuditEventInput): Promise<AuditEventOutput> {
    const rec = await auditRepository.findById(input.id);
    if (!rec) {
      throw new ORPCError("NOT_FOUND", {
        data: { resourceType: "AuditLog", resourceId: input.id },
      });
    }
    return toAuditEventOutput(rec);
  },
};
