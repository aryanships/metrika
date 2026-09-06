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
import type { InspectionTemplateOutput, InspectionTemplateItemKind } from "../../schema";

const ITEM_KINDS: InspectionTemplateItemKind[] = ["CHECKLIST", "NUMERIC", "TEXT", "SELECT", "MEASUREMENT"];

interface ItemInput {
  code: string;
  label: string;
  kind: InspectionTemplateItemKind;
  unit: string;
  isRequired: boolean;
}

interface FormState {
  instrumentTypeId: string;
  code: string;
  name: string;
  effectiveFrom: string;
  effectiveUntil: string;
  isActive: boolean;
}

const EMPTY: FormState = {
  instrumentTypeId: "",
  code: "",
  name: "",
  effectiveFrom: "",
  effectiveUntil: "",
  isActive: true,
};

const EMPTY_ITEM: ItemInput = { code: "", label: "", kind: "CHECKLIST", unit: "", isRequired: true };

export function InspectionTemplatesSection() {
  return (
    <Suspense fallback={<InspectionTemplatesSkeleton />}>
      <QueryErrorBoundary>
        <InspectionTemplatesContent />
      </QueryErrorBoundary>
    </Suspense>
  );
}

export function InspectionTemplatesSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function InspectionTemplatesContent() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InspectionTemplateOutput | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [items, setItems] = useState<ItemInput[]>([EMPTY_ITEM]);
  const [error, setError] = useState<string | null>(null);

  const { data } = useSuspenseQuery(
    orpc.masters.listInspectionTemplates.queryOptions({ input: { page: 1, limit: 100 } }),
  );
  const typesQuery = useQuery(orpc.masters.listInstrumentTypes.queryOptions({ input: { page: 1, limit: 100 } }));

  const create = useMutation(
    orpc.masters.createInspectionTemplate.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.masters.key() }),
    }),
  );
  const update = useMutation(
    orpc.masters.updateInspectionTemplate.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.masters.key() }),
    }),
  );
  const remove = useMutation(
    orpc.masters.deleteInspectionTemplate.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.masters.key() }),
    }),
  );

  const types = typesQuery.data?.items ?? [];
  const typeById = new Map(types.map((t) => [t.id, t.name]));

  function setItem(index: number, patch: Partial<ItemInput>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setItems([EMPTY_ITEM]);
    setError(null);
    setOpen(true);
  }

  function openEdit(template: InspectionTemplateOutput) {
    setEditing(template);
    setForm({
      instrumentTypeId: template.instrumentTypeId,
      code: template.code,
      name: template.name,
      effectiveFrom: toDatetimeLocal(template.effectiveFrom),
      effectiveUntil: toDatetimeLocal(template.effectiveUntil),
      isActive: template.isActive,
    });
    setError(null);
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const window = {
        effectiveFrom: fromDatetimeLocal(form.effectiveFrom)!,
        effectiveUntil: fromDatetimeLocal(form.effectiveUntil),
      };
      if (editing) {
        await update.mutateAsync({ id: editing.id, name: form.name, isActive: form.isActive, ...window });
      } else {
        await create.mutateAsync({
          instrumentTypeId: form.instrumentTypeId,
          code: form.code,
          name: form.name,
          ...window,
          items: items.map((it, i) => ({
            code: it.code,
            label: it.label,
            kind: it.kind,
            unit: it.unit || undefined,
            isRequired: it.isRequired,
            displayOrder: i + 1,
          })),
        });
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
          {open ? "Close" : "New template"}
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
            {!editing && (
              <Field label="Code">
                <input className={inputClass} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
              </Field>
            )}
            <Field label="Name">
              <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Effective from">
              <input className={inputClass} type="datetime-local" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} required />
            </Field>
            <Field label="Effective until (optional)">
              <input className={inputClass} type="datetime-local" value={form.effectiveUntil} onChange={(e) => setForm({ ...form, effectiveUntil: e.target.value })} />
            </Field>
            {editing && (
              <Field label="Active">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              </Field>
            )}
          </div>

          {!editing && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Items</span>
                <Button type="button" variant="outline" size="sm" onClick={() => setItems((prev) => [...prev, { ...EMPTY_ITEM }])}>
                  Add item
                </Button>
              </div>
              {items.map((item, index) => (
                <div key={index} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_1fr_auto_auto_auto_auto]">
                  <input className={inputClass} placeholder="Code" value={item.code} onChange={(e) => setItem(index, { code: e.target.value })} required />
                  <input className={inputClass} placeholder="Label" value={item.label} onChange={(e) => setItem(index, { label: e.target.value })} required />
                  <select className={inputClass} value={item.kind} onChange={(e) => setItem(index, { kind: e.target.value as InspectionTemplateItemKind })}>
                    {ITEM_KINDS.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                  <input className={inputClass} placeholder="Unit" value={item.unit} onChange={(e) => setItem(index, { unit: e.target.value })} />
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={item.isRequired} onChange={(e) => setItem(index, { isRequired: e.target.checked })} />
                    Required
                  </label>
                  <Button type="button" variant="ghost" size="sm" disabled={items.length === 1} onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {editing ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      )}

      <DataTable<InspectionTemplateOutput>
        rows={data.items}
        getRowKey={(t) => t.id}
        emptyTitle="No inspection templates"
        columns={[
          { header: "Type", cell: (t) => <span className="text-xs">{typeById.get(t.instrumentTypeId) ?? "—"}</span> },
          { header: "Code", cell: (t) => <span className="font-mono text-xs">{t.code}</span> },
          { header: "Name", cell: (t) => <span className="font-medium">{t.name}</span> },
          { header: "Version", cell: (t) => <span className="text-xs">v{t.version}</span> },
          { header: "Items", cell: (t) => <span className="text-xs">{t.items.length}</span> },
          {
            header: "Status",
            cell: (t) => (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.isActive ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                {t.isActive ? "Active" : "Inactive"}
              </span>
            ),
          },
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
