import { db } from "@/prisma/db";

/** Every ancestor of a unit (including itself), walking parent links upward. */
export async function ancestorUnitIds(unitId: string): Promise<Set<string>> {
  const ids = new Set<string>();
  let unit = await db.orm.public.AdministrativeUnit.first({ id: unitId });
  while (unit) {
    ids.add(unit.id);
    unit = unit.parentId ? await db.orm.public.AdministrativeUnit.first({ id: unit.parentId }) : null;
  }
  return ids;
}

/** Every descendant of the given roots (including the roots themselves). */
export async function descendantUnitIds(rootIds: string[]): Promise<Set<string>> {
  const result = new Set<string>();
  if (rootIds.length === 0) return result;

  const units = await db.orm.public.AdministrativeUnit.select("id", "parentId").all();
  const children = new Map<string, string[]>();
  for (const unit of units) {
    if (!unit.parentId) continue;
    const list = children.get(unit.parentId) ?? [];
    list.push(unit.id);
    children.set(unit.parentId, list);
  }

  const stack = [...rootIds];
  while (stack.length) {
    const id = stack.pop()!;
    if (result.has(id)) continue;
    result.add(id);
    for (const child of children.get(id) ?? []) stack.push(child);
  }
  return result;
}
