import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createInitialContext } from "@/middleware/context";
import { AppShell } from "@/components/app-shell";

const LINKS = [
  { href: "/system", label: "Dashboard" },
  { href: "/system/masters/administrative-units", label: "Administrative units" },
  { href: "/system/masters/instrument-types", label: "Instrument types" },
  { href: "/system/masters/regulatory-rules", label: "Regulatory rules" },
  { href: "/system/masters/inspection-templates", label: "Inspection templates" },
  { href: "/system/admins", label: "Admins" },
  { href: "/system/audit", label: "Audit log" },
];

export default async function SystemLayout({ children }: { children: React.ReactNode }) {
  const { user } = await createInitialContext(await headers());

  if (!user || !user.isActive || !user.roles.includes("SYSTEM_ADMIN")) {
    redirect("/login");
  }

  return (
    <AppShell user={user} links={LINKS}>
      {children}
    </AppShell>
  );
}
