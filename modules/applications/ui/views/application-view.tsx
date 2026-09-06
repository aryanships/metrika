import { ApplicationDetailSection } from "../sections/application-detail-section";

export function ApplicationView({ id }: { id: string }) {
  return <ApplicationDetailSection id={id} />;
}
