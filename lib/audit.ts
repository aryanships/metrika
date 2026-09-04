import { auditService } from "@/modules/audit/server/service";
import type { AppContext } from "@/middleware/context";

export async function auditAction(
  context: AppContext,
  action: string,
  entityType: string,
  entityId: string,
  newState?: unknown,
): Promise<void> {
  if (!context.user) return;
  await auditService.recordAuditEvent({
    actorId: context.user.id,
    actorRole: context.user.roles.join(",") || null,
    action,
    entityType,
    entityId,
    newState,
    ipAddress: context.clientIp,
    requestId: context.requestId,
  });
}
