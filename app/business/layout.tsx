import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createInitialContext } from "@/middleware/context";
import { AppShell } from "@/components/app-shell";

const LINKS = [
  { href: "/business", label: "Dashboard" },
  { href: "/business/instruments", label: "Instruments" },
  { href: "/business/applications", label: "Applications" },
  { href: "/business/certificates", label: "Certificates" },
  { href: "/business/notifications", label: "Notifications" },
  { href: "/business/profile", label: "Profile" },
];

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const { user } = await createInitialContext(await headers());

  if (!user || !user.roles.includes("INSTRUMENT_OWNER")) {
    redirect("/login");
  }

  return (
    <AppShell user={user} links={LINKS}>
      {children}
    </AppShell>
  );
}
