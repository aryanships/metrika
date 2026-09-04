import { CertificateDetailSection } from "@/modules/certificates/ui/sections/certificate-detail-section";

export default async function CertificateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CertificateDetailSection id={id} />;
}
