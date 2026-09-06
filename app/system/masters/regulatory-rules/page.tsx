import { RegulatoryRulesSection } from "@/modules/masters/ui/sections/regulatory-rules-section";

export default function RegulatoryRulesPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Regulatory rules</h1>
        <p className="text-sm text-muted-foreground">
          Versioned tolerance windows; overlapping capacity/class bands are rejected.
        </p>
      </header>
      <RegulatoryRulesSection />
    </div>
  );
}
