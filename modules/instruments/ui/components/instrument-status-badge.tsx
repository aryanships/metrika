import type { InstrumentStatus } from "../../schema";

const STATUS_STYLES: Record<InstrumentStatus, string> = {
  REGISTERED: "bg-muted text-muted-foreground",
  PENDING_VERIFICATION: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  VERIFIED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  EXPIRING_SOON: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  EXPIRED: "bg-destructive/10 text-destructive",
  INACTIVE: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<InstrumentStatus, string> = {
  REGISTERED: "Registered",
  PENDING_VERIFICATION: "Pending verification",
  VERIFIED: "Verified",
  EXPIRING_SOON: "Expiring soon",
  EXPIRED: "Expired",
  INACTIVE: "Inactive",
};

export function InstrumentStatusBadge({ status }: { status: InstrumentStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
