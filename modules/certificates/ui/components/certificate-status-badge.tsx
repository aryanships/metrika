import type { CertificateStatus } from "../../schema";

const STATUS_STYLES: Record<CertificateStatus, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  EXPIRING_SOON: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  EXPIRED: "bg-destructive/10 text-destructive",
  SUSPENDED: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  CANCELLED: "bg-muted text-muted-foreground",
  REVOKED: "bg-destructive/10 text-destructive",
  SUPERSEDED: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<CertificateStatus, string> = {
  ACTIVE: "Active",
  EXPIRING_SOON: "Expiring soon",
  EXPIRED: "Expired",
  SUSPENDED: "Suspended",
  CANCELLED: "Cancelled",
  REVOKED: "Revoked",
  SUPERSEDED: "Superseded",
};

export function CertificateStatusBadge({ status }: { status: CertificateStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
