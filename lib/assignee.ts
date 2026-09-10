import { db } from "@/prisma/db";

/** Human-readable name for a work order's assignee (LMO officer or GATC centre). */
export async function resolveAssigneeName(
  route: string,
  lmoId: string | null,
  gatcId: string | null,
): Promise<string | null> {
  if (route === "LMO" && lmoId) {
    const lmo = await db.orm.public.Lmo.first({ id: lmoId });
    if (!lmo) return null;
    const user = await db.orm.public.User.first({ id: lmo.userId });
    return user?.fullName ?? lmo.employeeId;
  }
  if (route === "GATC" && gatcId) {
    const gatc = await db.orm.public.Gatc.first({ id: gatcId });
    return gatc?.legalName ?? null;
  }
  return null;
}
