import { FieldApplicationDetailSection } from "../sections/field-application-detail-section";

export function FieldApplicationView({ id }: { id: string }) {
  return (
    <div className="flex flex-col gap-6">
      <FieldApplicationDetailSection id={id} />
    </div>
  );
}
