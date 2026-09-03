import { base } from "@/contracts/base";
import {
  ListAuditEventsInputSchema,
  ListAuditEventsOutputSchema,
  GetAuditEventInputSchema,
  AuditEventOutputSchema,
} from "./schema";

export const listEventsContract = base
  .route({
    method: "GET",
    path: "/audit/events",
    summary: "List audit trail events",
    description: "System admin view of immutable system audit events, changes, and operational actions.",
    tags: ["Audit"],
  })
  .input(ListAuditEventsInputSchema)
  .output(ListAuditEventsOutputSchema);

export const getEventContract = base
  .route({
    method: "GET",
    path: "/audit/events/{id}",
    summary: "Get audit event detail",
    description: "Fetches detailed before/after diff and actor metadata for an audit event.",
    tags: ["Audit"],
  })
  .input(GetAuditEventInputSchema)
  .output(AuditEventOutputSchema);

export const auditContract = {
  listEvents: listEventsContract,
  getEvent: getEventContract,
};
