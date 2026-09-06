import { AdminCertificatesSection } from "@/modules/certificates/ui/sections/admin-certificates-section";

export default function AdminCertificatesPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Certificates</h1>
        <p className="text-sm text-muted-foreground">Issue certificates for passed applications and manage certificate status.</p>
      </header>
      <AdminCertificatesSection />
    </div>
  );
}
