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
    { href: "/admin", label: "Dashboard", icon: "dashboard" },
    { href: "/admin/applications", label: "Applications", icon: "applications" },
    { href: "/admin/lmos", label: "LMOs", icon: "lmos" },
    { href: "/admin/gatcs", label: "GATCs", icon: "gatcs" },
    { href: "/admin/certificates", label: "Certificates", icon: "certificates" },
    { href: "/admin/audit", label: "Audit log", icon: "audit" },
  ];

  return (
    <AppShell user={user} links={links}>
      {children}
    </AppShell>
  );
}
