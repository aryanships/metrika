"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AwardIcon,
  BellIcon,
  Building2Icon,
  ClipboardListIcon,
  FileCheck2Icon,
  HistoryIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  ScaleIcon,
  SettingsIcon,
  ShieldCheckIcon,
  StoreIcon,
  UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";

export interface NavLink {
  href: string;
  label: string;
  icon?: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboardIcon,
  applications: ClipboardListIcon,
  lmos: UsersIcon,
  gatcs: Building2Icon,
  certificates: AwardIcon,
  audit: HistoryIcon,
  instruments: ScaleIcon,
  notifications: BellIcon,
  profile: StoreIcon,
  inspect: ShieldCheckIcon,
  settings: SettingsIcon,
  verify: FileCheck2Icon,
};

function resolveIcon(link: NavLink): React.ComponentType<{ className?: string }> | null {
  if (link.icon && ICON_MAP[link.icon]) {
    return ICON_MAP[link.icon];
  }
  const href = link.href.toLowerCase();
  if (href.endsWith("/admin") || href.endsWith("/business") || href.endsWith("/field") || href.endsWith("/system")) {
    return LayoutDashboardIcon;
  }
  if (href.includes("/applications")) return ClipboardListIcon;
  if (href.includes("/lmos")) return UsersIcon;
  if (href.includes("/gatcs")) return Building2Icon;
  if (href.includes("/certificates")) return AwardIcon;
  if (href.includes("/audit")) return HistoryIcon;
  if (href.includes("/instruments")) return ScaleIcon;
  if (href.includes("/notifications")) return BellIcon;
  if (href.includes("/profile")) return StoreIcon;
  if (href.includes("/work-orders")) return ClipboardListIcon;
  return null;
}

export function SidebarNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active = pathname === link.href;
        const Icon = resolveIcon(link);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary/10 font-semibold text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {Icon && <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />}
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const initial = user.fullName ? user.fullName.charAt(0).toUpperCase() : "U";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-3 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground" title={user.fullName}>
              {user.fullName}
            </p>
            <p className="truncate text-[10px] text-muted-foreground font-mono" title={user.email}>
              {user.email}
            </p>
          </div>
        </div>
        <ThemeToggle />
      </div>
      <Button variant="outline" size="sm" className="h-8 w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground" onClick={logout}>
        <LogOutIcon className="size-3.5" />
        Sign out
      </Button>
    </div>
  );
}

export function Sidebar({ links }: { links: NavLink[] }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-card/30 p-4 lg:flex">
      <Link href={links[0]?.href ?? "/"} className="mb-6 flex items-center gap-2.5 px-3">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-xs">
          M
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight">Digital Metrology</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground font-mono">Administration</span>
        </div>
      </Link>
      <div className="flex-1 overflow-y-auto pr-1">
        <SidebarNav links={links} />
      </div>
      <div className="mt-auto pt-4">
        <UserMenu />
      </div>
    </aside>
  );
}
