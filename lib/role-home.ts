/**
 * Single source of truth for "where does a user land after login". Every role
 * maps to exactly one home route; the login page and layouts reuse this so the
 * redirect logic lives in one place.
 */
const ADMIN_ROLES = ["STATE_ADMIN", "DISTRICT_ADMIN", "SYSTEM_ADMIN", "DEPARTMENT_OFFICIAL"] as const;

export function roleHome(roles: readonly string[]): string {
  if (roles.includes("INSTRUMENT_OWNER")) return "/business";
  if (roles.includes("SYSTEM_ADMIN")) return "/system";
  if (roles.some((role) => (ADMIN_ROLES as readonly string[]).includes(role))) return "/admin";
  // LMO + GATC staff (GATC authority is held via GatcMembership, not a role).
  return "/field";
}
