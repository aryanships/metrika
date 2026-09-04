import Link from "next/link";
import { InstrumentsListSection } from "@/modules/instruments/ui/sections/instruments-list-section";

export default function InstrumentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Instruments</h1>
          <p className="text-sm text-muted-foreground">Your registered weighing and measuring instruments.</p>
        </div>
        <Link
          href="/owner/instruments/new"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          Register instrument
        </Link>
      </header>
      <InstrumentsListSection />
    </div>
  );
}
