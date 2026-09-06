import { FieldCertificatesSection } from "@/modules/certificates/ui/sections/field-certificates-section";

export default function FieldCertificatesPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Certificates</h1>
        <p className="text-sm text-muted-foreground">Certificates issued for your verification work.</p>
      </header>
      <FieldCertificatesSection />
    </div>
  );
}
