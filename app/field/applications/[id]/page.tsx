import { FieldApplicationDetailSection } from "@/modules/applications/ui/sections/field-application-detail-section";

export default async function FieldApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex flex-col gap-6">
      <FieldApplicationDetailSection id={id} />
    </div>
  );
}
