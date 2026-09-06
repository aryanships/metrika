import { AdministrativeUnitsSection } from "@/modules/masters/ui/sections/administrative-units-section";

export default function AdministrativeUnitsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Administrative units</h1>
        <p className="text-sm text-muted-foreground">
          State → District → Tehsil → Village hierarchy used for locations, jurisdictions, and scopes.
        </p>
      </header>
      <AdministrativeUnitsSection />
    </div>
  );
}
