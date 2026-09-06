"use client";

import { Suspense, useState } from "react";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { describeError } from "@/lib/errors";
import { QueryErrorBoundary } from "@/components/query-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Field, inputClass } from "../field";
import type { InstrumentTypeOutput } from "../../schema";

interface FormState {
  code: string;
  name: string;
  unit: string;
}

const EMPTY: FormState = { code: "", name: "", unit: "" };

export function InstrumentTypesSection() {
  return (
    <Suspense fallback={<InstrumentTypesSkeleton />}>
      <QueryErrorBoundary>
        <InstrumentTypesContent />
      </QueryErrorBoundary>
    </Suspense>
  );
}

export function InstrumentTypesSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function InstrumentTypesContent() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InstrumentTypeOutput | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const { data } = useSuspenseQuery(
    orpc.masters.listInstrumentTypes.queryOptions({ input: { page: 1, limit: 100 } }),
  );

  const create = useMutation(
    orpc.masters.createInstrumentType.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.masters.key() }),
    }),
  );
  const update = useMutation(
    orpc.masters.updateInstrumentType.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.masters.key() }),
    }),
  );
  const remove = useMutation(
    orpc.masters.deleteInstrumentType.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.masters.key() }),
    }),
  );

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  }

  function openEdit(type: InstrumentTypeOutput) {
    setEditing(type);
    setForm({ code: type.code, name: type.name, unit: type.unit });
    setError(null);
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, code: form.code, name: form.name, unit: form.unit });
      } else {
        await create.mutateAsync({ code: form.code, name: form.name, unit: form.unit });
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
          {open ? "Close" : "Add type"}
        </Button>
      </div>

      {open && (
        <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Code">
              <input className={inputClass} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            </Field>
            <Field label="Name">
              <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Unit">
              <input className={inputClass} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {editing ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      )}

      <DataTable<InstrumentTypeOutput>
        rows={data.items}
        getRowKey={(t) => t.id}
        emptyTitle="No instrument types"
        columns={[
          { header: "Code", cell: (t) => <span className="font-mono text-xs">{t.code}</span> },
          { header: "Name", cell: (t) => <span className="font-medium">{t.name}</span> },
          { header: "Unit", cell: (t) => <span className="text-xs">{t.unit}</span> },
          {
            header: "Actions",
            cell: (t) => (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>Edit</Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (confirm(`Delete "${t.name}"?`)) remove.mutate({ id: t.id });
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
