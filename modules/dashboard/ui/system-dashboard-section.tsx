"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { StatCard } from "@/components/stat-card";

export function SystemDashboardSection() {
  const statsQuery = useQuery(orpc.dashboard.getStats.queryOptions({}));

  if (statsQuery.isPending) return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;

  const s = statsQuery.data?.system;
  if (!s) return <p className="text-sm text-muted-foreground">No platform statistics available.</p>;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Platform</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Users" value={s.users} />
          <StatCard label="Businesses" value={s.businesses} />
          <StatCard label="Instruments" value={s.instruments} />
          <StatCard label="Applications" value={s.applications} />
          <StatCard label="Certificates" value={s.certificates} />
          <StatCard label="Audit events" value={s.auditEvents} />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Master data</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="States" value={s.states} />
          <StatCard label="Districts" value={s.districts} />
          <StatCard label="Tehsils" value={s.tehsils} />
          <StatCard label="Villages" value={s.villages} />
          <StatCard label="Instrument types" value={s.instrumentTypes} />
          <StatCard label="Regulatory rules" value={s.regulatoryRules} />
          <StatCard label="Inspection templates" value={s.inspectionTemplates} />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Provisioning</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="LMOs" value={s.lmos} />
          <StatCard label="GATCs" value={s.gatcs} />
          <StatCard label="Admin accounts" value={s.admins} />
        </div>
      </section>
    </div>
  );
}
