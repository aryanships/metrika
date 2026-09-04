"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { InstrumentStatusBadge } from "../components/instrument-status-badge";
import type { InstrumentOutput } from "../../schema";

function InstrumentCard({ instrument }: { instrument: InstrumentOutput }) {
  return (
    <Link
      href={`/owner/instruments/${instrument.id}`}
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
  const { data, isPending, error } = useQuery(
    orpc.instruments.list.queryOptions({ input: { page: 1, limit: 100 } }),
  );

  if (isPending) return <p className="text-sm text-muted-foreground">Loading instruments…</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load instruments.</p>;

  if (!data || data.items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <p className="text-sm text-muted-foreground">No instruments registered yet.</p>
        <Link href="/owner/instruments/new" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
          Register your first instrument
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.items.map((instrument) => (
        <InstrumentCard key={instrument.id} instrument={instrument} />
      ))}
    </div>
  );
}
