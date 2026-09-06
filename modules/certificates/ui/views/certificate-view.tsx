import { CertificateDetailSection } from "../sections/certificate-detail-section";

export function CertificateView({ id }: { id: string }) {
  return <CertificateDetailSection id={id} />;
}
