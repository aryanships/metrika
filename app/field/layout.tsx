import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createInitialContext } from "@/middleware/context";
import { db } from "@/prisma/db";
import { AppShell } from "@/components/app-shell";

const LINKS = [
  { href: "/field", label: "Dashboard" },
  { href: "/field/work-orders", label: "Work orders" },
  { href: "/field/certificates", label: "Certificates" },
];

export default async function FieldLayout({ children }: { children: React.ReactNode }) {
  const { user } = await createInitialContext(await headers());

  if (!user || !user.isActive) redirect("/login");

  const isLmo = user.roles.includes("LMO");
  const membership = isLmo
    ? null
    : await db.orm.public.GatcMembership.where({ userId: user.id, isActive: true }).first();

  if (!isLmo && !membership) redirect("/login");

  return (
    <AppShell user={user} links={LINKS}>
      {children}
    </AppShell>
  );
}
