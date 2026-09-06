"use client";

import { Suspense, useState } from "react";
import { useMutation, useQuery, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { describeError } from "@/lib/errors";
import { QueryErrorBoundary } from "@/components/query-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import type { LmoOutput } from "../../schema";

const inputClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex max-h-40 flex-col gap-1 overflow-auto rounded-md border border-input p-2">
        {options.length === 0 ? (
          <span className="text-xs text-muted-foreground">None available</span>
        ) : (
          options.map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(o.id)}
                onChange={() => onToggle(o.id)}
              />
              {o.name}
            </label>
          ))
        )}
      </div>
    </div>
  );
}

const EMPTY = {
  email: "",
  fullName: "",
  phone: "",
  employeeId: "",
  designation: "",
  baseAdministrativeUnitId: "",
};

export function AdminLmosSection() {
  return (
    <Suspense fallback={<AdminLmosSkeleton />}>
      <QueryErrorBoundary>
        <AdminLmosContent />
      </QueryErrorBoundary>
    </Suspense>
  );
}

export function AdminLmosSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

function AdminLmosContent() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [expertise, setExpertise] = useState<string[]>([]);
  const [jurisdictions, setJurisdictions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<string | null>(null);

  const { data } = useSuspenseQuery(
    orpc.organizations.listLmos.queryOptions({ input: { page: 1, limit: 200, activeOnly: false } }),
  );
  const districtsQuery = useQuery(
    orpc.masters.listAdministrativeUnits.queryOptions({ input: { type: "DISTRICT", page: 1, limit: 200 } }),
  );
  const typesQuery = useQuery(orpc.masters.listInstrumentTypes.queryOptions({ input: { page: 1, limit: 100 } }));

  const create = useMutation(
    orpc.organizations.createLmo.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.organizations.key() }),
    }),
  );

  const districts = districtsQuery.data?.items ?? [];
  const types = typesQuery.data?.items ?? [];
  const districtById = new Map(districts.map((d) => [d.id, d.name]));

  function toggle(list: string[], set: (v: string[]) => void, id: string) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const created = await create.mutateAsync({
        email: form.email,
        fullName: form.fullName,
        phone: form.phone || undefined,
        employeeId: form.employeeId,
        designation: form.designation,
        baseAdministrativeUnitId: form.baseAdministrativeUnitId,
        expertiseTypeIds: expertise,
        jurisdictionIds: jurisdictions,
      });
      setInvitation(created.invitationToken);
      setForm(EMPTY);
      setExpertise([]);
      setJurisdictions([]);
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {invitation && (
        <div className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          <p className="font-medium">LMO provisioned. Share this one-time invitation token:</p>
          <p className="mt-1 break-all font-mono">{invitation}</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Close" : "Provision LMO"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <input className={inputClass} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            </Field>
            <Field label="Email">
              <input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Field>
            <Field label="Phone (optional)">
              <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Employee / officer ID">
              <input className={inputClass} value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required />
            </Field>
            <Field label="Designation">
              <input className={inputClass} value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} required />
            </Field>
            <Field label="Base unit">
              <select className={inputClass} value={form.baseAdministrativeUnitId} onChange={(e) => setForm({ ...form, baseAdministrativeUnitId: e.target.value })} required>
                <option value="">Select district…</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <CheckboxGroup
              label="Expertise (instrument types)"
              options={types}
              selected={expertise}
              onToggle={(id) => toggle(expertise, setExpertise, id)}
            />
            <CheckboxGroup
              label="Jurisdictions (districts)"
              options={districts}
              selected={jurisdictions}
              onToggle={(id) => toggle(jurisdictions, setJurisdictions, id)}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Provisioning…" : "Provision LMO"}
            </Button>
          </div>
        </form>
      )}

      <DataTable<LmoOutput>
        rows={data.items}
        getRowKey={(r) => r.id}
        emptyTitle="No LMOs provisioned"
        columns={[
          {
            header: "Name",
            cell: (r) => (
              <div className="flex flex-col">
                <span className="font-medium">{r.fullName}</span>
                <span className="text-xs text-muted-foreground">{r.email}</span>
              </div>
            ),
          },
          { header: "Employee ID", cell: (r) => <span className="font-mono text-xs">{r.employeeId}</span> },
          { header: "Designation", cell: (r) => <span className="text-xs">{r.designation}</span> },
          {
            header: "Base",
            cell: (r) => <span className="text-xs">{r.baseAdministrativeUnitId ? districtById.get(r.baseAdministrativeUnitId) ?? "—" : "—"}</span>,
          },
          { header: "Expertise", cell: (r) => <span className="text-xs">{r.expertiseTypeIds.length}</span> },
          { header: "Jurisdictions", cell: (r) => <span className="text-xs">{r.jurisdictionIds.length}</span> },
          {
            header: "Status",
            cell: (r) => (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.isActive ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                {r.isActive ? "Active" : "Inactive"}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
