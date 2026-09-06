"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { describeError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Field, inputClass } from "../field";
import type { AdministrativeUnitOutput, AdminUnitType } from "../../schema";

const UNIT_TYPES: AdminUnitType[] = ["STATE", "DISTRICT", "TEHSIL", "VILLAGE"];
const PARENT_TYPE: Record<AdminUnitType, AdminUnitType | null> = {
  STATE: null,
  DISTRICT: "STATE",
  TEHSIL: "DISTRICT",
  VILLAGE: "TEHSIL",
};

interface FormState {
  name: string;
  type: AdminUnitType;
  parentId: string;
  latitude: string;
  longitude: string;
}

const EMPTY: FormState = { name: "", type: "DISTRICT", parentId: "", latitude: "", longitude: "" };

export function AdministrativeUnitsSection() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdministrativeUnitOutput | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const unitsQuery = useQuery(
    orpc.masters.listAdministrativeUnits.queryOptions({ input: { page: 1, limit: 100 } }),
  );

  const create = useMutation(
    orpc.masters.createAdministrativeUnit.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.masters.key() }),
    }),
  );
  const update = useMutation(
    orpc.masters.updateAdministrativeUnit.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.masters.key() }),
    }),
  );
  const remove = useMutation(
    orpc.masters.deleteAdministrativeUnit.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.masters.key() }),
    }),
  );

  const units = unitsQuery.data?.items ?? [];
  const byId = new Map(units.map((u) => [u.id, u]));
  const parentOptions = units.filter((u) => u.type === PARENT_TYPE[form.type]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  }

  function openEdit(unit: AdministrativeUnitOutput) {
    setEditing(unit);
    setForm({
      name: unit.name,
      type: unit.type,
      parentId: unit.parentId ?? "",
      latitude: unit.latitude ?? "",
      longitude: unit.longitude ?? "",
    });
    setError(null);
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          name: form.name,
          latitude: form.latitude || undefined,
          longitude: form.longitude || undefined,
        });
      } else {
        await create.mutateAsync({
          name: form.name,
          type: form.type,
          parentId: PARENT_TYPE[form.type] ? form.parentId || undefined : undefined,
          latitude: form.latitude || undefined,
          longitude: form.longitude || undefined,
        });
      }
      setOpen(false);
    } catch (err) {
      setError(describeError(err));
    }
  }

  if (unitsQuery.isPending) return <p className="text-sm text-muted-foreground">Loading units…</p>;

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => (open ? setOpen(false) : openCreate())}>
          {open ? "Close" : "Add unit"}
        </Button>
      </div>

      {open && (
        <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            {!editing && (
              <Field label="Type">
                <select
                  className={inputClass}
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as AdminUnitType, parentId: "" })}
                >
                  {UNIT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
            )}
            {!editing && PARENT_TYPE[form.type] && (
              <Field label={`Parent (${PARENT_TYPE[form.type]})`}>
                <select className={inputClass} value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} required>
                  <option value="">Select parent…</option>
                  {parentOptions.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Latitude (optional)">
              <input className={inputClass} value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
            </Field>
            <Field label="Longitude (optional)">
              <input className={inputClass} value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {editing ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      )}

      <DataTable<AdministrativeUnitOutput>
        rows={units}
        getRowKey={(u) => u.id}
        emptyTitle="No administrative units"
        columns={[
          { header: "Name", cell: (u) => <span className="font-medium">{u.name}</span> },
          { header: "Type", cell: (u) => <span className="text-xs">{u.type}</span> },
          {
            header: "Parent",
            cell: (u) => <span className="text-xs">{u.parentId ? byId.get(u.parentId)?.name ?? "—" : "—"}</span>,
          },
          {
            header: "Coordinates",
            cell: (u) => (
              <span className="text-xs text-muted-foreground">
                {u.latitude && u.longitude ? `${u.latitude}, ${u.longitude}` : "—"}
              </span>
            ),
          },
          {
            header: "Actions",
            cell: (u) => (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>Edit</Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (confirm(`Delete "${u.name}"?`)) remove.mutate({ id: u.id });
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
