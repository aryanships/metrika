import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createInitialContext } from "@/middleware/context";
import { RoleNav } from "@/components/role-nav";

const ADMIN_ROLES = ["STATE_ADMIN", "DISTRICT_ADMIN", "SYSTEM_ADMIN", "DEPARTMENT_OFFICIAL"] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await createInitialContext(await headers());

  if (!user || !user.isActive || !ADMIN_ROLES.some((r) => user.roles.includes(r))) {
    redirect("/login");
  }

  const links = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/audit", label: "Audit log" },
  ];

  return (
    <div className="min-h-full">
      <RoleNav name={user.fullName} email={user.email} links={links} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
