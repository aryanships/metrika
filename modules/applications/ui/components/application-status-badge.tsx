import type { ApplicationStatus } from "../../schema";

const STYLES: Record<ApplicationStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SUBMITTED: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  UNDER_REVIEW: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  DOCUMENTS_REQUIRED: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  APPROVED: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  SCHEDULED: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  VERIFICATION_IN_PROGRESS: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  PASSED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  FAILED: "bg-destructive/10 text-destructive",
  CERTIFICATE_GENERATED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  REJECTED: "bg-destructive/10 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground",
};

const LABELS: Record<ApplicationStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  DOCUMENTS_REQUIRED: "Documents required",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
  VERIFICATION_IN_PROGRESS: "Verification in progress",
  PASSED: "Passed",
  FAILED: "Failed",
  CERTIFICATE_GENERATED: "Certificate generated",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
