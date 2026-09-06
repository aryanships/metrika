import { AdminApplicationDetailSection } from "../sections/admin-application-detail-section";

export function AdminApplicationView({ id }: { id: string }) {
  return <AdminApplicationDetailSection id={id} />;
}
