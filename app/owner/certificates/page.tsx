import { CertificatesListSection } from "@/modules/certificates/ui/sections/certificates-list-section";

export default function CertificatesPage() {
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
