import { AdminGatcsSection } from "@/modules/organizations/ui/sections/admin-gatcs-section";

export default function AdminGatcsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Government Approved Testing Centres</h1>
        <p className="text-sm text-muted-foreground">Provision testing centres, their authorizations, and staff.</p>
      </header>
      <AdminGatcsSection />
    </div>
  );
}
