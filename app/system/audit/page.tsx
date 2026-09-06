import { AuditLogSection } from "@/modules/audit/ui/audit-log-section";

export default function SystemAuditPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          Immutable, append-only record of who did what, when, and where.
        </p>
      </header>
      <AuditLogSection />
    </div>
  );
}
