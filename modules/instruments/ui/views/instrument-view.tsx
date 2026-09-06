import { InstrumentDetailSection } from "../sections/instrument-detail-section";

export function InstrumentView({ id }: { id: string }) {
  return <InstrumentDetailSection id={id} />;
}
