"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { formatDate } from "@/lib/format";
import { DataTable } from "@/components/data-table";
import { Pagination } from "@/components/pagination";
import { ApplicationStatusBadge } from "../components/application-status-badge";
import type { ApplicationOutput, Priority, ApplicationStatus, ApplicationType } from "../../schema";

const inputClass =
  "h-9 rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

const STATUSES: ApplicationStatus[] = [
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
  "DRAFT",
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

const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH"];

const PRIORITY_STYLES: Record<Priority, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  HIGH: "bg-destructive/10 text-destructive",
};

function humanize(value: string): string {
  return value.toLowerCase().replaceAll("_", " ");
}

export function AdminApplicationsSection() {
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [priority, setPriority] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const districtsQuery = useQuery(
    orpc.masters.listAdministrativeUnits.queryOptions({ input: { type: "DISTRICT", page: 1, limit: 200 } }),
  );

  const query = useQuery(
    orpc.applications.listQueue.queryOptions({
      input: {
        page,
        limit: 20,
        status: (status || undefined) as ApplicationStatus | undefined,
        type: (type || undefined) as ApplicationType | undefined,
        priority: (priority || undefined) as Priority | undefined,
        districtId: districtId || undefined,
        sortOrder,
      },
    }),
  );

  if (query.isPending) return <p className="text-sm text-muted-foreground">Loading review queue…</p>;
  if (query.error) return <p className="text-sm text-destructive">Failed to load review queue.</p>;

  const applications = query.data?.items ?? [];
  const pagination = query.data?.pagination;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <select className={inputClass} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{humanize(s)}</option>
          ))}
        </select>
        <select className={inputClass} value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{humanize(p)}</option>
          ))}
        </select>
        <select className={inputClass} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">All types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>{humanize(t)}</option>
          ))}
        </select>
        <select className={inputClass} value={districtId} onChange={(e) => { setDistrictId(e.target.value); setPage(1); }}>
          <option value="">All districts</option>
          {(districtsQuery.data?.items ?? []).map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select className={inputClass} value={sortOrder} onChange={(e) => { setSortOrder(e.target.value as "asc" | "desc"); setPage(1); }}>
          <option value="asc">Oldest first</option>
          <option value="desc">Newest first</option>
        </select>
      </div>

      <DataTable<ApplicationOutput>
        rows={applications}
        getRowKey={(r) => r.id}
        emptyTitle="No applications in the review queue"
        columns={[
          {
            header: "Code",
            cell: (r) => (
              <Link href={`/admin/applications/${r.id}`} className="font-mono font-medium text-primary hover:underline">
                {r.applicationCode}
              </Link>
            ),
          },
          { header: "Type", cell: (r) => <span className="text-xs capitalize">{humanize(r.type)}</span> },
          { header: "Instrument", cell: (r) => <span className="font-mono text-xs">{r.instrumentCode}</span> },
          {
            header: "Priority",
            cell: (r) => (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[r.priority]}`}>
                {humanize(r.priority)}
              </span>
            ),
          },
          { header: "Status", cell: (r) => <ApplicationStatusBadge status={r.status} /> },
          { header: "Created", cell: (r) => <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span> },
        ]}
      />

      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          hasMore={pagination.hasMore}
          onPage={setPage}
        />
      )}
    </div>
  );
}
