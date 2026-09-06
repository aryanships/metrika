"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { InstrumentStatusBadge } from "../components/instrument-status-badge";
import { EmptyState } from "@/components/empty-state";
import type { InstrumentOutput, InstrumentStatus } from "../../schema";

const STATUSES: InstrumentStatus[] = [
  "REGISTERED",
  "PENDING_VERIFICATION",
  "VERIFIED",
  "EXPIRING_SOON",
  "EXPIRED",
  "INACTIVE",
];

const inputClass =
  "h-9 rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

function InstrumentCard({ instrument }: { instrument: InstrumentOutput }) {
  return (
    <Link
      href={`/business/instruments/${instrument.id}`}
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-sm font-semibold">{instrument.instrumentCode}</span>
        <InstrumentStatusBadge status={instrument.status} />
      </div>
      <p className="text-sm font-medium">{instrument.instrumentTypeName}</p>
      <p className="text-xs text-muted-foreground">
        {instrument.manufacturer} · {instrument.model}
      </p>
      <p className="mt-auto text-xs text-muted-foreground">{instrument.address}</p>
    </Link>
  );
}

export function InstrumentsListSection() {
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data, isPending, error } = useQuery(
    orpc.instruments.list.queryOptions({ input: { page: 1, limit: 100 } }),
  );

  if (isPending) return <p className="text-sm text-muted-foreground">Loading instruments…</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load instruments.</p>;

  const q = search.trim().toLowerCase();
  const items = (data?.items ?? []).filter((instrument) => {
    if (status && instrument.status !== status) return false;
    if (q) {
      const haystack = [
        instrument.instrumentCode,
        instrument.instrumentTypeName,
        instrument.manufacturer,
        instrument.model,
        instrument.serialNumber,
        instrument.administrativeUnitName,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <input
          className={`${inputClass} min-w-48 flex-1`}
          placeholder="Search by code, type, manufacturer, serial…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.toLowerCase().replaceAll("_", " ")}</option>
          ))}
        </select>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No instruments"
          description={search || status ? "No instruments match your filters." : "Register your first instrument to get started."}
          action={
            !search && !status ? (
              <Link href="/business/instruments/new" className="text-sm font-medium text-primary hover:underline">
                Register an instrument
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((instrument) => (
            <InstrumentCard key={instrument.id} instrument={instrument} />
          ))}
        </div>
      )}
    </div>
  );
}
