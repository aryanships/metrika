import { ApplicationNewSection } from "@/modules/applications/ui/sections/application-new-section";
import type { ApplicationType } from "@/modules/applications/schema";

const VALID_TYPES: ApplicationType[] = [
  "INITIAL_VERIFICATION",
  "RE_VERIFICATION",
  "POST_REPAIR_VERIFICATION",
  "RELOCATION_RE_VERIFICATION",
  "OWNERSHIP_TRANSFER",
  "CERTIFICATE_CORRECTION",
  "DUPLICATE_CERTIFICATE",
];

export default async function NewApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ instrumentId?: string; type?: string }>;
}) {
  const { instrumentId, type } = await searchParams;
  const initialType = type && (VALID_TYPES as string[]).includes(type) ? (type as ApplicationType) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">New application</h1>
        <p className="text-sm text-muted-foreground">Create a verification or certificate service request.</p>
      </header>
      <ApplicationNewSection initialInstrumentId={instrumentId} initialType={initialType} />
    </div>
  );
}
