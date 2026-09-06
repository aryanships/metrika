import { AdminLmosSection } from "../sections/admin-lmos-section";

export function AdminLmosView() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Legal Metrology Officers</h1>
        <p className="text-sm text-muted-foreground">Provision officers, set expertise, and assign jurisdictions.</p>
      </header>
      <AdminLmosSection />
    </div>
  );
}
