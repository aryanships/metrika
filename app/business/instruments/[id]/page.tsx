import { InstrumentDetailSection } from "@/modules/instruments/ui/sections/instrument-detail-section";

export default async function InstrumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InstrumentDetailSection id={id} />;
}
