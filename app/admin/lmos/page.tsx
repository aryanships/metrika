import { AdminLmosSection } from "@/modules/organizations/ui/sections/admin-lmos-section";

export default function AdminLmosPage() {
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
