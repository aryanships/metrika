import { InstrumentRegisterSection } from "@/modules/instruments/ui/sections/instrument-register-section";

export default function NewInstrumentPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Register instrument</h1>
        <p className="text-sm text-muted-foreground">Create a permanent Digital Metrology Identity for your instrument.</p>
      </header>
      <InstrumentRegisterSection />
    </div>
  );
}
