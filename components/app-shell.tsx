"use client";

import type { ReactNode } from "react";
import type { AppUser } from "@/middleware/context";
import { AuthProvider } from "@/hooks/use-auth";
import { Sidebar, type NavLink } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";

export function AppShell({
  user,
  links,
  children,
}: {
  user: AppUser;
  links: NavLink[];
  children: ReactNode;
}) {
  return (
    <AuthProvider user={user}>
      <div className="flex min-h-dvh w-full">
        <Sidebar links={links} />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileNav links={links} />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
