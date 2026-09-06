"use client";

import { Suspense, useState } from "react";
import { useMutation, useQuery, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { describeError } from "@/lib/errors";
import { QueryErrorBoundary } from "@/components/query-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Field, inputClass, toDatetimeLocal, fromDatetimeLocal } from "../field";
import type { RegulatoryRuleOutput } from "../../schema";

interface FormState {
  instrumentTypeId: string;
  accuracyClass: string;
  capacityMin: string;
  capacityMax: string;
  permissibleError: string;
  verificationPeriodMonths: string;
  effectiveFrom: string;
  effectiveUntil: string;
}

const EMPTY: FormState = {
  instrumentTypeId: "",
  accuracyClass: "",
  capacityMin: "",
  capacityMax: "",
  permissibleError: "",
  verificationPeriodMonths: "12",
  effectiveFrom: "",
  effectiveUntil: "",
};

export function RegulatoryRulesSection() {
  return (
    <Suspense fallback={<RegulatoryRulesSkeleton />}>
      <QueryErrorBoundary>
        <RegulatoryRulesContent />
      </QueryErrorBoundary>
    </Suspense>
  );
}

export function RegulatoryRulesSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function RegulatoryRulesContent() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RegulatoryRuleOutput | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const { data } = useSuspenseQuery(
    orpc.masters.listRegulatoryRules.queryOptions({ input: { page: 1, limit: 100 } }),
  );
  const typesQuery = useQuery(orpc.masters.listInstrumentTypes.queryOptions({ input: { page: 1, limit: 100 } }));

  const create = useMutation(
    orpc.masters.createRegulatoryRule.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.masters.key() }),
    }),
  );
  const update = useMutation(
    orpc.masters.updateRegulatoryRule.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.masters.key() }),
    }),
  );
  const remove = useMutation(
    orpc.masters.deleteRegulatoryRule.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.masters.key() }),
    }),
  );

  const types = typesQuery.data?.items ?? [];
  const typeById = new Map(types.map((t) => [t.id, t.name]));

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  }

  function openEdit(rule: RegulatoryRuleOutput) {
    setEditing(rule);
    setForm({
      instrumentTypeId: rule.instrumentTypeId,
      accuracyClass: rule.accuracyClass,
      capacityMin: rule.capacityMin,
      capacityMax: rule.capacityMax,
      permissibleError: rule.permissibleError,
      verificationPeriodMonths: String(rule.verificationPeriodMonths),
      effectiveFrom: toDatetimeLocal(rule.effectiveFrom),
      effectiveUntil: toDatetimeLocal(rule.effectiveUntil),
    });
    setError(null);
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const base = {
        accuracyClass: form.accuracyClass,
        capacityMin: form.capacityMin,
        capacityMax: form.capacityMax,
        permissibleError: form.permissibleError,
        verificationPeriodMonths: Number(form.verificationPeriodMonths),
        effectiveFrom: fromDatetimeLocal(form.effectiveFrom)!,
        effectiveUntil: fromDatetimeLocal(form.effectiveUntil),
      };
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...base });
      } else {
        await create.mutateAsync({ instrumentTypeId: form.instrumentTypeId, ...base });
      }
      setOpen(false);
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => (open ? setOpen(false) : openCreate())}>
          {open ? "Close" : "Add rule"}
        </Button>
      </div>

      {open && (
        <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {!editing && (
              <Field label="Instrument type">
                <select className={inputClass} value={form.instrumentTypeId} onChange={(e) => setForm({ ...form, instrumentTypeId: e.target.value })} required>
                  <option value="">Select type…</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Accuracy class">
              <input className={inputClass} value={form.accuracyClass} onChange={(e) => setForm({ ...form, accuracyClass: e.target.value })} required />
            </Field>
            <Field label="Capacity min">
              <input className={inputClass} value={form.capacityMin} onChange={(e) => setForm({ ...form, capacityMin: e.target.value })} required />
            </Field>
            <Field label="Capacity max">
              <input className={inputClass} value={form.capacityMax} onChange={(e) => setForm({ ...form, capacityMax: e.target.value })} required />
            </Field>
            <Field label="Permissible error">
              <input className={inputClass} value={form.permissibleError} onChange={(e) => setForm({ ...form, permissibleError: e.target.value })} required />
            </Field>
            <Field label="Verification period (months)">
              <input className={inputClass} type="number" min="1" value={form.verificationPeriodMonths} onChange={(e) => setForm({ ...form, verificationPeriodMonths: e.target.value })} required />
            </Field>
            <Field label="Effective from">
              <input className={inputClass} type="datetime-local" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} required />
            </Field>
            <Field label="Effective until (optional)">
              <input className={inputClass} type="datetime-local" value={form.effectiveUntil} onChange={(e) => setForm({ ...form, effectiveUntil: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {editing ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      )}

      <DataTable<RegulatoryRuleOutput>
        rows={data.items}
        getRowKey={(r) => r.id}
        emptyTitle="No regulatory rules"
        columns={[
          { header: "Type", cell: (r) => <span className="text-xs">{typeById.get(r.instrumentTypeId) ?? "—"}</span> },
          { header: "Class", cell: (r) => <span className="text-xs">{r.accuracyClass}</span> },
          {
            header: "Capacity",
            cell: (r) => <span className="text-xs">{r.capacityMin} – {r.capacityMax}</span>,
          },
          { header: "MPE", cell: (r) => <span className="text-xs">{r.permissibleError}</span> },
          { header: "Period (mo)", cell: (r) => <span className="text-xs">{r.verificationPeriodMonths}</span> },
          {
            header: "Effective",
            cell: (r) => (
              <span className="text-xs text-muted-foreground">
                {new Date(r.effectiveFrom).toLocaleDateString("en-IN")} → {r.effectiveUntil ? new Date(r.effectiveUntil).toLocaleDateString("en-IN") : "open"}
              </span>
            ),
          },
          {
            header: "Actions",
            cell: (r) => (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>Edit</Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (confirm("Delete this rule?")) remove.mutate({ id: r.id });
                  }}
                >
                  Delete
                </Button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
