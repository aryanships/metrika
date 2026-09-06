import { FieldInspectionSection } from "@/modules/inspections/ui/sections/field-inspection-section";

export default async function FieldInspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="flex flex-col gap-6">
      <FieldInspectionSection applicationId={id} />
    </div>
  );
}
