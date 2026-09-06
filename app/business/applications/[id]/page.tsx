import { ApplicationDetailSection } from "@/modules/applications/ui/sections/application-detail-section";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ApplicationDetailSection id={id} />;
}
