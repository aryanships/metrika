"use client";

import { Suspense } from "react";
import Link from "next/link";
import {
  CheckCircle2Icon,
  ClockIcon,
  LandmarkIcon,
  LayersIcon,
  TriangleAlertIcon,
  UsersIcon,
} from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { useAuth } from "@/hooks/use-auth";
import { QueryErrorBoundary } from "@/components/query-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  DOCUMENTS_REQUIRED: "Documents required",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
  VERIFICATION_IN_PROGRESS: "In progress",
  PASSED: "Passed",
  FAILED: "Failed",
  CERTIFICATE_GENERATED: "Certificate generated",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const TONES = {
  amber: "text-amber-600",
  emerald: "text-emerald-600",
  rose: "text-rose-600",
  blue: "text-blue-600",
} as const;

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof TONES;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <Icon className={cn("size-4", TONES[tone])} />
      </div>
      <span className={cn("text-2xl font-bold", TONES[tone])}>{value}</span>
      <span className="text-[11px] text-muted-foreground">{hint}</span>
    </div>
  );
}

export function AdminDashboardSection() {
  return (
    <Suspense fallback={<AdminDashboardSkeleton />}>
      <QueryErrorBoundary>
        <AdminDashboardContent />
      </QueryErrorBoundary>
    </Suspense>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-4 sm:grid-cols-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

function AdminDashboardContent() {
  const { user } = useAuth();
  const { data } = useSuspenseQuery(orpc.dashboard.getStats.queryOptions({}));

  const admin = data.admin;

  const appEntries = admin ? Object.entries(admin.applicationsByStatus) : [];
  const certTotal = admin ? Object.values(admin.certificatesByStatus).reduce((a, b) => a + b, 0) : 0;
  const appTotal = appEntries.reduce((a, [, c]) => a + c, 0);
  const expiringSoon = admin?.certificatesByStatus.EXPIRING_SOON ?? 0;
  const expired = admin?.certificatesByStatus.EXPIRED ?? 0;
  const openWorkload =
    (admin?.lmoWorkload.reduce((a, l) => a + l.open, 0) ?? 0) +
    (admin?.gatcWorkload.reduce((a, g) => a + g.open, 0) ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 rounded-3xl bg-slate-900 p-6 text-white shadow-xl md:flex-row md:items-center">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-400">
              <LandmarkIcon className="h-3 w-3" /> Admin
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{user.fullName}</h1>
          <p className="font-mono text-xs text-slate-400">{user.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/applications"
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700"
          >
            <LayersIcon className="size-3.5" /> Review applications
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Applications" value={appTotal} icon={ClockIcon} tone="amber" hint="Total verification requests" />
        <StatCard label="Certificates" value={certTotal} icon={CheckCircle2Icon} tone="emerald" hint="Issued certificates" />
        <StatCard label="Needs renewal" value={expiringSoon + expired} icon={TriangleAlertIcon} tone="rose" hint="Expiring soon or expired" />
        <StatCard label="Active field audits" value={openWorkload} icon={UsersIcon} tone="blue" hint="Open officer / GATC tasks" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Applications by status</h2>
          {appEntries.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {appEntries.map(([status, count]) => (
                <div key={status} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span>{APPLICATION_STATUS_LABELS[status] ?? status}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No applications.</p>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Applications by district</h2>
          {admin && admin.applicationsByDistrict.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {admin.applicationsByDistrict.map((row) => (
                <div key={row.district} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span>{row.district}</span>
                  <span className="font-medium">{row.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No scoped applications.</p>
          )}

          <h2 className="mt-4 text-sm font-semibold">Officer workload</h2>
          {admin && admin.lmoWorkload.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {admin.lmoWorkload.map((lmo) => (
                <div key={lmo.name} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span>{lmo.name}</span>
                  <span className="font-medium">{lmo.open} open</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No officers.</p>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Certificates by status</h2>
          {admin && Object.entries(admin.certificatesByStatus).length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {Object.entries(admin.certificatesByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span>{status.toLowerCase().replaceAll("_", " ")}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No certificates.</p>
          )}

          <h2 className="mt-4 text-sm font-semibold">GATC workload</h2>
          {admin && admin.gatcWorkload.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {admin.gatcWorkload.map((gatc) => (
                <div key={gatc.name} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span>{gatc.name}</span>
                  <span className="font-medium">{gatc.open} open</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No GATCs.</p>
          )}
        </section>
      </div>
    </div>
  );
}
