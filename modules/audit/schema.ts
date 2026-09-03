import { z } from "zod";
import { PaginationInputSchema, PaginationMetaSchema } from "@/schemas/shared";

export const AuditEventOutputSchema = z.object({
  id: z.string(),
  actorId: z.string().nullable(),
  actorRole: z.string().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  previousState: z.unknown().nullable(),
  newState: z.unknown().nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.string(),
});
export type AuditEventOutput = z.infer<typeof AuditEventOutputSchema>;

export const ListAuditEventsInputSchema = PaginationInputSchema.extend({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  actorId: z.string().optional(),
  action: z.string().optional(),
});
export type ListAuditEventsInput = z.infer<typeof ListAuditEventsInputSchema>;

export const ListAuditEventsOutputSchema = z.object({
  items: z.array(AuditEventOutputSchema),
  pagination: PaginationMetaSchema,
});
export type ListAuditEventsOutput = z.infer<typeof ListAuditEventsOutputSchema>;

export const GetAuditEventInputSchema = z.object({
  id: z.string().min(1, "Audit event ID is required"),
});
export type GetAuditEventInput = z.infer<typeof GetAuditEventInputSchema>;
