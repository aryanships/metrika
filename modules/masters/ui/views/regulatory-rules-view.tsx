import { RegulatoryRulesSection } from "../sections/regulatory-rules-section";

export function RegulatoryRulesView() {
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
