import { AuditLogSection } from "../sections/audit-log-section";

export function AuditLogView({ description }: { description: string }) {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Audit log</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>
      <AuditLogSection />
    </div>
  );
}
