import { InstrumentTypesSection } from "../sections/instrument-types-section";

export function InstrumentTypesView() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Instrument types</h1>
        <p className="text-sm text-muted-foreground">
          Controlled master categories referenced by instruments, rules, and templates.
        </p>
      </header>
      <InstrumentTypesSection />
    </div>
  );
}
