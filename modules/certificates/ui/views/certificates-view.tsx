import { CertificatesListSection } from "../sections/certificates-list-section";

export function CertificatesView() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Certificates</h1>
        <p className="text-sm text-muted-foreground">Prototype verification certificates issued for your instruments.</p>
      </header>
      <CertificatesListSection />
    </div>
  );
}
