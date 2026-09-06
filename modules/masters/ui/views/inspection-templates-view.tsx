import { InspectionTemplatesSection } from "../sections/inspection-templates-section";

export function InspectionTemplatesView() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Inspection templates</h1>
        <p className="text-sm text-muted-foreground">
          Versioned, category-specific inspection forms with ordered items.
        </p>
      </header>
      <InspectionTemplatesSection />
    </div>
  );
}
