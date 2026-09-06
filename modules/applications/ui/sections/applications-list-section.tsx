"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { formatDate } from "@/lib/format";
import { QueryErrorBoundary } from "@/components/query-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicationStatusBadge } from "../components/application-status-badge";
import { EmptyState } from "@/components/empty-state";
import type { ApplicationStatus, ApplicationType } from "../../schema";

const inputClass =
  "h-9 rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

const STATUSES: ApplicationStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "DOCUMENTS_REQUIRED",
  "APPROVED",
  "SCHEDULED",
  "VERIFICATION_IN_PROGRESS",
  "PASSED",
  "FAILED",
  "CERTIFICATE_GENERATED",
  "REJECTED",
  "CANCELLED",
];

const TYPES: ApplicationType[] = [
  "INITIAL_VERIFICATION",
  "RE_VERIFICATION",
  "POST_REPAIR_VERIFICATION",
  "RELOCATION_RE_VERIFICATION",
  "OWNERSHIP_TRANSFER",
  "CERTIFICATE_CORRECTION",
  "DUPLICATE_CERTIFICATE",
];

function humanize(value: string): string {
  return value.toLowerCase().replaceAll("_", " ");
}

export function ApplicationsListSection() {
  const [status, setStatus] = useState<string>("");
  const [type, setType] = useState<string>("");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{humanize(s)}</option>
          ))}
        </select>
        <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>{humanize(t)}</option>
          ))}
        </select>
      </div>

      <Suspense key={`${status}-${type}`} fallback={<ApplicationsListSkeleton />}>
        <QueryErrorBoundary>
          <ApplicationsListContent
            status={(status || undefined) as ApplicationStatus | undefined}
            type={(type || undefined) as ApplicationType | undefined}
          />
        </QueryErrorBoundary>
      </Suspense>
    </div>
  );
}

export function ApplicationsListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function ApplicationsListContent({ status, type }: { status?: ApplicationStatus; type?: ApplicationType }) {
  const { data } = useSuspenseQuery(
    orpc.applications.listMine.queryOptions({
      input: {
        page: 1,
        limit: 100,
        status: (status || undefined) as ApplicationStatus | undefined,
        type: (type || undefined) as ApplicationType | undefined,
      },
    }),
  );

  const applications = data.items;

  if (applications.length === 0) {
    return (
      <EmptyState
        title="No applications"
        description="Apply for verification or a certificate service to get started."
        action={
          <Link href="/business/applications/new" className="text-sm font-medium text-primary hover:underline">
            New application
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {applications.map((app) => (
        <Link
          key={app.id}
          href={`/business/applications/${app.id}`}
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:border-ring"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono font-medium">{app.applicationCode}</span>
              <span className="text-xs capitalize text-muted-foreground">{humanize(app.type)}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {app.instrumentCode} · {formatDate(app.createdAt)}
            </span>
          </div>
          <ApplicationStatusBadge status={app.status} />
        </Link>
      ))}
    </div>
  );
}
