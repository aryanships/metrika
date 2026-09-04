import { ORPCError } from "@orpc/server";
import type { ApplicationStatus } from "../schema";

/**
 * Application lifecycle state machine. Each transition records the actor who
 * may perform it and whether a reason is required. Phase 7/8/9 transitions
 * (schedule, inspection, certificate) are listed here so the full lifecycle is
 * auditable in one place even though those phases drive them later.
 */
export type ApplicationActor = "OWNER" | "ADMIN" | "FIELD" | "SYSTEM";

export interface TransitionDef {
  from: ApplicationStatus;
  to: ApplicationStatus;
  actor: ApplicationActor;
  reasonRequired?: boolean;
}

export const TRANSITIONS: readonly TransitionDef[] = [
  // Owner submits a draft (initial) or resubmits after corrections.
  { from: "DRAFT", to: "SUBMITTED", actor: "OWNER" },
  { from: "DOCUMENTS_REQUIRED", to: "SUBMITTED", actor: "OWNER" },

  // Owner cancels an application that is still open and owner-owned.
  { from: "DRAFT", to: "CANCELLED", actor: "OWNER", reasonRequired: true },
  { from: "SUBMITTED", to: "CANCELLED", actor: "OWNER", reasonRequired: true },
  { from: "DOCUMENTS_REQUIRED", to: "CANCELLED", actor: "OWNER", reasonRequired: true },

  // State/district admin review actions.
  { from: "SUBMITTED", to: "UNDER_REVIEW", actor: "ADMIN" },
  { from: "UNDER_REVIEW", to: "DOCUMENTS_REQUIRED", actor: "ADMIN", reasonRequired: true },
  { from: "UNDER_REVIEW", to: "APPROVED", actor: "ADMIN" },
  { from: "UNDER_REVIEW", to: "REJECTED", actor: "ADMIN", reasonRequired: true },

  // Assignment/scheduling (Phase 7).
  { from: "APPROVED", to: "SCHEDULED", actor: "ADMIN" },

  // Field inspection (Phase 8).
  { from: "SCHEDULED", to: "VERIFICATION_IN_PROGRESS", actor: "FIELD" },
  { from: "VERIFICATION_IN_PROGRESS", to: "PASSED", actor: "FIELD" },
  { from: "VERIFICATION_IN_PROGRESS", to: "FAILED", actor: "FIELD" },

  // Certificate issuance (Phase 9).
  { from: "PASSED", to: "CERTIFICATE_GENERATED", actor: "SYSTEM" },
];

export function findTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  actor: ApplicationActor,
): TransitionDef | undefined {
  return TRANSITIONS.find((t) => t.from === from && t.to === to && t.actor === actor);
}

export function canTransition(from: ApplicationStatus, to: ApplicationStatus, actor: ApplicationActor): boolean {
  return findTransition(from, to, actor) !== undefined;
}

export function assertTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  actor: ApplicationActor,
  reason?: string,
): void {
  const transition = findTransition(from, to, actor);
  if (!transition) {
    throw new ORPCError("INVALID_STATE", {
      data: {
        currentState: from,
        expectedState: to,
        reason: `Transition ${from} -> ${to} is not allowed for ${actor}`,
      },
    });
  }
  if (transition.reasonRequired && !reason) {
    throw new ORPCError("VALIDATION_ERROR", {
      data: { issues: [{ path: "reason", message: "A reason is required for this transition" }] },
    });
  }
}

/** True when the status is terminal: no further owner or admin action applies. */
export const TERMINAL_STATUSES: readonly ApplicationStatus[] = [
  "REJECTED",
  "CANCELLED",
  "FAILED",
  "CERTIFICATE_GENERATED",
];

/** Verification application types that must not duplicate an open application. */
export const VERIFICATION_TYPES: readonly string[] = [
  "INITIAL_VERIFICATION",
  "RE_VERIFICATION",
  "POST_REPAIR_VERIFICATION",
  "RELOCATION_RE_VERIFICATION",
];
