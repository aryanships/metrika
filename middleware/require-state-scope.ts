import { ORPCError } from "@orpc/server";
import { db } from "@/prisma/db";
import type { AppUser } from "./context";

/**
 * Ensures the actor's administrative scope (state/district) covers the target
 * unit. Walks the target's ancestor chain and passes if any ancestor (or the
 * unit itself) is one of the actor's scoped units.
 */
export async function requireStateScope(user: AppUser, targetUnitId: string): Promise<void> {
  const scopes = await db.orm.public.AdminScope.where({ userId: user.id }).all();
  if (scopes.length === 0) {
    throw new ORPCError("FORBIDDEN", { data: { reason: "No administrative scope assigned" } });
  }
  const scopeIds = new Set(scopes.map((s) => s.administrativeUnitId));

  let unit = await db.orm.public.AdministrativeUnit.first({ id: targetUnitId });
  while (unit) {
    if (scopeIds.has(unit.id)) return;
    unit = unit.parentId ? await db.orm.public.AdministrativeUnit.first({ id: unit.parentId }) : null;
  }

  throw new ORPCError("FORBIDDEN", { data: { reason: "Target is outside your administrative scope" } });
}
