"use client";

import { Suspense } from "react";
import Link from "next/link";
import {
  AwardIcon,
  Building2Icon,
  CheckCircle2Icon,
  ChevronRightIcon,
  ClipboardListIcon,
  ClockIcon,
  LandmarkIcon,
  MapPinIcon,
  TriangleAlertIcon,
  UsersIcon,
} from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { useAuth } from "@/hooks/use-auth";
import { QueryErrorBoundary } from "@/components/query-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplicationStatusBadge } from "@/modules/applications/ui/components/application-status-badge";
import { CertificateStatusBadge } from "@/modules/certificates/ui/components/certificate-status-badge";
import type { ApplicationStatus } from "@/modules/applications/schema";
import type { CertificateStatus } from "@/modules/certificates/schema";
import { cn } from "@/lib/utils";

const TONE_COLORS = {
  amber: "text-amber-600 dark:text-amber-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  rose: "text-rose-600 dark:text-rose-400",
  blue: "text-blue-600 dark:text-blue-400",
} as const;

const TONE_BGS = {
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
} as const;

function StatCard({
  label,
  value,
  href,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: number;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof TONE_COLORS;
  hint: string;
}) {
  const content = (
    <div className="group relative flex flex-col justify-between gap-3 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border/80 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className={cn("flex size-8 items-center justify-center rounded-lg transition-colors", TONE_BGS[tone])}>
          <Icon className={cn("size-4", TONE_COLORS[tone])} />
        </div>
      </div>
      <div>
        <div className={cn("text-3xl font-extrabold tracking-tight", TONE_COLORS[tone])}>
          {value}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block focus:outline-none">
      {content}
    </Link>
  ) : (
    content
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
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
        <div className="space-y-6 lg:col-span-5">
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function AdminDashboardContent() {
  const { user } = useAuth();
  const { data } = useSuspenseQuery(orpc.dashboard.getStats.queryOptions({}));

  const admin = data.admin;

  const appEntries = admin ? Object.entries(admin.applicationsByStatus) : [];
  const certEntries = admin ? Object.entries(admin.certificatesByStatus) : [];
  const certTotal = certEntries.reduce((a, [, c]) => a + c, 0);
  const appTotal = appEntries.reduce((a, [, c]) => a + c, 0);
  const expiringSoon = admin?.certificatesByStatus.EXPIRING_SOON ?? 0;
  const expired = admin?.certificatesByStatus.EXPIRED ?? 0;
  const lmoOpenTotal = admin?.lmoWorkload.reduce((a, l) => a + l.open, 0) ?? 0;
  const gatcOpenTotal = admin?.gatcWorkload.reduce((a, g) => a + g.open, 0) ?? 0;
  const openWorkload = lmoOpenTotal + gatcOpenTotal;

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome & Admin Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/30 p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                <LandmarkIcon className="size-3.5" /> District Administration
              </span>
              <span className="inline-flex items-center rounded-full border border-border bg-muted/60 px-2.5 py-0.5 font-mono text-xs text-muted-foreground">
                Lucknow Directorate
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {user.fullName}
            </h1>
            <p className="font-mono text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/admin/applications"
              className={buttonVariants({ size: "sm", className: "gap-1.5 shadow-xs" })}
            >
              <ClipboardListIcon className="size-4" />
              Review applications
            </Link>
            <Link
              href="/admin/lmos"
              className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5" })}
            >
              <UsersIcon className="size-4" />
              Manage officers
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Applications"
          value={appTotal}
          href="/admin/applications"
          icon={ClockIcon}
          tone="amber"
          hint="Total verification requests"
        />
        <StatCard
          label="Certificates"
          value={certTotal}
          href="/admin/certificates"
          icon={CheckCircle2Icon}
          tone="emerald"
          hint="Active & valid certificates"
        />
        <StatCard
          label="Needs renewal"
          value={expiringSoon + expired}
          href="/admin/certificates"
          icon={TriangleAlertIcon}
          tone="rose"
          hint="Expiring soon or expired"
        />
        <StatCard
          label="Active field audits"
          value={openWorkload}
          href="/admin/lmos"
          icon={UsersIcon}
          tone="blue"
          hint="Open officer & GATC tasks"
        />
      </div>

      {/* Balanced 12-Column Responsive Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Applications & Regulatory Pipeline */}
        <div className="flex flex-col gap-6 lg:col-span-7">
          {/* Applications by Status Card */}
          <Card className="rounded-2xl border-border shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Applications by Status</CardTitle>
                <CardDescription>Verification workflow distribution</CardDescription>
              </div>
              <Link
                href="/admin/applications"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:underline"
              >
                View queue <ChevronRightIcon className="size-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="pt-4">
              {appEntries.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {appEntries.map(([status, count]) => {
                    const percent = appTotal > 0 ? Math.round((count / appTotal) * 100) : 0;
                    return (
                      <Link
                        key={status}
                        href={`/admin/applications?status=${status}`}
                        className="group flex flex-col gap-1.5 rounded-xl border border-border/70 bg-card/60 p-3 transition-all hover:border-primary/40 hover:bg-muted/40"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ApplicationStatusBadge status={status as ApplicationStatus} />
                            <span className="text-xs text-muted-foreground">({percent}%)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-sm font-bold text-foreground">{count}</span>
                            <ChevronRightIcon className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                          </div>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary/70 transition-all duration-300"
                            style={{ width: `${Math.max(percent, 4)}%` }}
                          />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">No applications in this jurisdiction.</p>
              )}
            </CardContent>
          </Card>

          {/* Certificates by Status Card */}
          <Card className="rounded-2xl border-border shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Certificates by Status</CardTitle>
                <CardDescription>Status breakdown of issued metrology certificates</CardDescription>
              </div>
              <Link
                href="/admin/certificates"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:underline"
              >
                View all <ChevronRightIcon className="size-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="pt-4">
              {certEntries.length > 0 ? (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {certEntries.map(([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center justify-between rounded-xl border border-border/70 bg-card/60 p-3"
                    >
                      <CertificateStatusBadge status={status as CertificateStatus} />
                      <span className="font-mono text-sm font-bold text-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">No certificates issued yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Applications by District Card */}
          <Card className="rounded-2xl border-border shadow-xs">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-base font-semibold">Applications by District</CardTitle>
              <CardDescription>Geographic distribution across administrative divisions</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {admin && admin.applicationsByDistrict.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {admin.applicationsByDistrict.map((row) => (
                    <div
                      key={row.district}
                      className="flex items-center justify-between rounded-xl border border-border/70 bg-card/60 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="size-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{row.district}</span>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {row.count} {row.count === 1 ? "application" : "applications"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">No district data available.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Field Operations & Workload Management */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          <Card className="flex flex-col rounded-2xl border-border shadow-xs">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-base font-semibold">Field Operations & Workload</CardTitle>
              <CardDescription>Inspector assignments and facility capacity</CardDescription>

              {/* Workload Summary Badges */}
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-xs">
                  <UsersIcon className="size-3.5 text-primary" />
                  <span className="font-semibold text-foreground">{admin?.lmoWorkload.length ?? 0}</span>
                  <span className="text-muted-foreground">Officers</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-xs">
                  <Building2Icon className="size-3.5 text-primary" />
                  <span className="font-semibold text-foreground">{admin?.gatcWorkload.length ?? 0}</span>
                  <span className="text-muted-foreground">GATC Labs</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-xs">
                  <AwardIcon className="size-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="font-semibold text-foreground">{openWorkload}</span>
                  <span className="text-muted-foreground">Open Tasks</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-6 pt-4">
              {/* Officer Workload Section */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Legal Metrology Officers ({admin?.lmoWorkload.length ?? 0})
                  </h3>
                  <Link
                    href="/admin/lmos"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:underline"
                  >
                    Manage <ChevronRightIcon className="size-3" />
                  </Link>
                </div>

                {admin && admin.lmoWorkload.length > 0 ? (
                  <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
                    {admin.lmoWorkload.map((lmo) => (
                      <div
                        key={lmo.name}
                        className="flex items-center justify-between rounded-xl border border-border/70 bg-card/60 p-2.5 text-sm transition-colors hover:bg-muted/30"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-semibold text-muted-foreground">
                            {lmo.name.charAt(0)}
                          </div>
                          <span className="truncate text-xs font-medium text-foreground" title={lmo.name}>
                            {lmo.name}
                          </span>
                        </div>
                        {lmo.open > 0 ? (
                          <span className="inline-flex shrink-0 items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                            {lmo.open} {lmo.open === 1 ? "audit" : "audits"}
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            Available
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-2 text-xs text-muted-foreground">No officers provisioned in this district.</p>
                )}
              </div>

              {/* GATC Workload Section */}
              <div className="flex flex-col gap-2.5 border-t border-border/60 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Testing Centres & Labs ({admin?.gatcWorkload.length ?? 0})
                  </h3>
                  <Link
                    href="/admin/gatcs"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:underline"
                  >
                    Manage <ChevronRightIcon className="size-3" />
                  </Link>
                </div>

                {admin && admin.gatcWorkload.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {admin.gatcWorkload.map((gatc) => (
                      <div
                        key={gatc.name}
                        className="flex items-center justify-between rounded-xl border border-border/70 bg-card/60 p-2.5 text-sm transition-colors hover:bg-muted/30"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Building2Icon className="size-4 shrink-0 text-muted-foreground" />
                          <span className="truncate text-xs font-medium text-foreground" title={gatc.name}>
                            {gatc.name}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            gatc.open > 0
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {gatc.open} {gatc.open === 1 ? "audit" : "audits"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-2 text-xs text-muted-foreground">No GATC facilities assigned.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
