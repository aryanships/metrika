"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { client } from "@/lib/orpc.client";

export interface NavLink {
  href: string;
  label: string;
}

export function RoleNav({
  name,
  email,
  links,
  brand = "Digital Metrology",
}: {
  name: string;
  email: string;
  links: NavLink[];
  brand?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await client.auth.logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href={links[0]?.href ?? "/"} className="text-sm font-semibold">
            {brand}
          </Link>
          <nav className="flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-2.5 py-1.5 text-sm ${
                  pathname === link.href ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs leading-tight">
            <p className="font-medium">{name}</p>
            <p className="text-muted-foreground">{email}</p>
          </div>
          <button onClick={logout} className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
