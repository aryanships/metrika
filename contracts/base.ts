import { oc } from "@orpc/contract";
import "@orpc/openapi";
import "@orpc/openapi/extensions/route";
import { z } from "zod";

/**
 * Shared API Error Definitions for Digital Metrology
 *
 * SECURITY INVARIANT:
 * No error payload must ever include password hashes, session tokens,
 * object-storage keys, or private evidence.
 */
export const base = oc.errors({
  UNAUTHORIZED: {
    status: 401,
    message: "Authentication required",
  },
  FORBIDDEN: {
    status: 403,
    message: "You do not have permission to perform this action",
    data: z
      .object({
        reason: z.string().optional(),
      })
      .optional(),
  },
  NOT_FOUND: {
    status: 404,
    message: "Resource not found",
    data: z.object({
      resourceType: z.string(),
      resourceId: z.string().optional(),
    }),
  },
  CONFLICT: {
    status: 409,
    message: "Resource conflict",
    data: z.object({
      field: z.string().optional(),
      value: z.string().optional(),
      message: z.string().optional(),
    }),
  },
  VALIDATION_ERROR: {
    status: 422,
    message: "Validation failed",
    data: z.object({
      issues: z.array(
        z.object({
          path: z.string(),
          message: z.string(),
        })
      ),
    }),
  },
  INVALID_STATE: {
    status: 409,
    message: "Invalid state transition or precondition",
    data: z.object({
      currentState: z.string(),
      expectedState: z.string().optional(),
      reason: z.string().optional(),
    }),
  },
});
