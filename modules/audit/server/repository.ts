/**
 * REPOSITORY BOUNDARY RULE:
 * This repository is strictly private to the `audit` module.
 * Other modules MUST NEVER import this repository directly.
 * Instead, call the exposed methods in `modules/audit/server/service.ts` or procedures.
 */

export interface AuditLogRecord {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  oldStateSafe?: Record<string, any> | null;
  newStateSafe?: Record<string, any> | null;
  ipAddress?: string | null;
  timestamp: Date;
}

export const auditRepository = {
  async listEvents() {
    return [];
  },

  async findById(id: string): Promise<AuditLogRecord | null> {
    return null;
  },

  async recordEvent(data: Omit<AuditLogRecord, "id" | "timestamp">): Promise<AuditLogRecord> {
    return {
      id: `aud_${Date.now()}`,
      timestamp: new Date(),
      ...data,
    };
  },
};
