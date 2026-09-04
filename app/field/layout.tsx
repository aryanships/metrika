import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createInitialContext } from "@/middleware/context";
import { db } from "@/prisma/db";
import { RoleNav } from "@/components/role-nav";

const LINKS = [{ href: "/field", label: "Dashboard" }];

export default async function FieldLayout({ children }: { children: React.ReactNode }) {
  const { user } = await createInitialContext(await headers());

  if (!user || !user.isActive) redirect("/login");

  const isLmo = user.roles.includes("LMO");
  const membership = isLmo
    ? null
    : await db.orm.public.GatcMembership.where({ userId: user.id, isActive: true }).first();

  if (!isLmo && !membership) redirect("/login");

  return (
    <div className="min-h-full">
      <RoleNav name={user.fullName} email={user.email} links={LINKS} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
