"use client";

import Link from "next/link";
import { MenuIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarNav, UserMenu, type NavLink } from "@/components/sidebar";

export function MobileNav({ links }: { links: NavLink[] }) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background px-4 py-3 lg:hidden">
      <Link href={links[0]?.href ?? "/"} className="text-sm font-semibold">
        Digital Metrology
      </Link>
      <Sheet>
        <SheetTrigger render={<Button variant="outline" size="icon" aria-label="Open menu" />}>
          <MenuIcon />
        </SheetTrigger>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Digital Metrology</SheetTitle>
            <SheetDescription className="sr-only">Navigation menu</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <SidebarNav links={links} />
          </div>
          <div className="border-t p-6">
            <UserMenu />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
