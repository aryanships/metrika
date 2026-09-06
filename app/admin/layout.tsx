import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createInitialContext } from "@/middleware/context";
import { AppShell } from "@/components/app-shell";

const ADMIN_ROLES = ["STATE_ADMIN", "DISTRICT_ADMIN", "SYSTEM_ADMIN", "DEPARTMENT_OFFICIAL"] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await createInitialContext(await headers());

  if (!user || !user.isActive || !ADMIN_ROLES.some((r) => user.roles.includes(r))) {
    redirect("/login");
  }

  const links = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/applications", label: "Applications" },
    { href: "/admin/lmos", label: "LMOs" },
    { href: "/admin/gatcs", label: "GATCs" },
    { href: "/admin/certificates", label: "Certificates" },
    { href: "/admin/audit", label: "Audit log" },
  ];

  return (
    <AppShell user={user} links={links}>
      {children}
    </AppShell>
  );
}
