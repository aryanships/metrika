import { auditRepository, AuditLogRecord } from "./repository";
import {
  ListAuditEventsInput,
  ListAuditEventsOutput,
  GetAuditEventInput,
  AuditEventOutput,
} from "../schema";

function toSafeAuditEventOutput(rec: AuditLogRecord): AuditEventOutput {
  return {
    id: rec.id,
    actorId: rec.actorId,
    actorRole: rec.actorRole,
    action: rec.action,
    entityType: rec.entityType,
    entityId: rec.entityId,
    oldStateSafe: rec.oldStateSafe ?? null,
    newStateSafe: rec.newStateSafe ?? null,
    ipAddress: rec.ipAddress ?? null,
    timestamp: rec.timestamp.toISOString(),
  };
}

export const auditService = {
  async recordAuditEvent(data: {
    actorId: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    oldStateSafe?: Record<string, any> | null;
    newStateSafe?: Record<string, any> | null;
    ipAddress?: string | null;
  }) {
    // SECURITY: Ensure safe state records do not contain password hashes, tokens, or raw private keys
    return auditRepository.recordEvent({
      actorId: data.actorId,
      actorRole: data.actorRole,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      oldStateSafe: data.oldStateSafe ?? null,
      newStateSafe: data.newStateSafe ?? null,
      ipAddress: data.ipAddress ?? null,
    });
  },

  async listEvents(input: ListAuditEventsInput): Promise<ListAuditEventsOutput> {
    const mock: AuditLogRecord = {
      id: "aud_demo_1",
      actorId: "usr_admin_1",
      actorRole: "STATE_ADMIN",
      action: "APPLICATION_APPROVED",
      entityType: "Application",
      entityId: "app_demo_1",
      oldStateSafe: { status: "UNDER_REVIEW" },
      newStateSafe: { status: "APPROVED" },
      ipAddress: "127.0.0.1",
      timestamp: new Date(),
    };

    return {
      items: [toSafeAuditEventOutput(mock)],
      pagination: {
        page: input.page ?? 1,
        limit: input.limit ?? 20,
        total: 1,
        totalPages: 1,
        hasMore: false,
        nextCursor: null,
      },
    };
  },

  async getEvent(input: GetAuditEventInput): Promise<AuditEventOutput> {
    const mock: AuditLogRecord = {
      id: input.id,
      actorId: "usr_admin_1",
      actorRole: "STATE_ADMIN",
      action: "APPLICATION_APPROVED",
      entityType: "Application",
      entityId: "app_demo_1",
      oldStateSafe: { status: "UNDER_REVIEW" },
      newStateSafe: { status: "APPROVED" },
      ipAddress: "127.0.0.1",
      timestamp: new Date(),
    };
    return toSafeAuditEventOutput(mock);
  },
};
