import Link from "next/link";
import { ApplicationsListSection } from "@/modules/applications/ui/sections/applications-list-section";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ApplicationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-sm text-muted-foreground">Verification and certificate service requests for your instruments.</p>
        </div>
        <Link href="/business/applications/new" className={cn(buttonVariants({ size: "sm" }))}>
          New application
        </Link>
      </header>
      <ApplicationsListSection />
    </div>
  );
}
