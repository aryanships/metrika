import { AdminCertificatesSection } from "../sections/admin-certificates-section";

export function AdminCertificatesView() {
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
