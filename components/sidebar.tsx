"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";

export interface NavLink {
  href: string;
  label: string;
}

export function SidebarNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function UserMenu() {
  const { user, logout } = useAuth();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <ThemeToggle />
      </div>
      <Button variant="outline" className="w-full" onClick={logout}>
        <LogOutIcon />
        Sign out
      </Button>
    </div>
  );
}

export function Sidebar({ links }: { links: NavLink[] }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border p-4 lg:flex">
      <Link href={links[0]?.href ?? "/"} className="mb-6 px-3 text-sm font-semibold">
        Digital Metrology
      </Link>
      <SidebarNav links={links} />
      <div className="mt-auto">
        <UserMenu />
      </div>
    </aside>
  );
}
