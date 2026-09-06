import { AdminApplicationDetailSection } from "@/modules/applications/ui/sections/admin-application-detail-section";

export default async function AdminApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminApplicationDetailSection id={id} />;
}
