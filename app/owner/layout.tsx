import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createInitialContext } from "@/middleware/context";
import { RoleNav } from "@/components/role-nav";

const LINKS = [
  { href: "/owner", label: "Dashboard" },
  { href: "/owner/profile", label: "Profile" },
  { href: "/owner/instruments", label: "Instruments" },
  { href: "/owner/certificates", label: "Certificates" },
];

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { user } = await createInitialContext(await headers());

  if (!user || !user.roles.includes("INSTRUMENT_OWNER")) {
    redirect("/login");
  }

  return (
    <div className="min-h-full">
      <RoleNav name={user.fullName} email={user.email} links={LINKS} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
