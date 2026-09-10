"use client";

import { Suspense, useState } from "react";
import { useMutation, useQuery, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { describeError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { QueryErrorBoundary } from "@/components/query-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import type { GatcOutput, GatcStaffRole } from "../../schema";

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
              <input type="checkbox" checked={selected.includes(o.id)} onChange={() => onToggle(o.id)} />
              {o.name}
            </label>
          ))
        )}
      </div>
    </div>
  );
}

const EMPTY_GATC = {
  legalName: "",
  approvalNumber: "",
  approvalValidFrom: "",
  approvalValidUntil: "",
  address: "",
  administrativeUnitId: "",
};

const EMPTY_STAFF = { gatcId: "", email: "", fullName: "", phone: "", role: "OPERATOR" as GatcStaffRole };

export function AdminGatcsSection() {
  return (
    <Suspense fallback={<AdminGatcsSkeleton />}>
      <QueryErrorBoundary>
        <AdminGatcsContent />
      </QueryErrorBoundary>
    </Suspense>
  );
}

export function AdminGatcsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

function AdminGatcsContent() {
  const queryClient = useQueryClient();
  const [showProvision, setShowProvision] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState(EMPTY_GATC);
  const [authorized, setAuthorized] = useState<string[]>([]);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [staff, setStaff] = useState(EMPTY_STAFF);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<React.ReactNode | null>(null);

  const { data } = useSuspenseQuery(
    orpc.organizations.listGatcs.queryOptions({ input: { page: 1, limit: 200, activeOnly: false } }),
  );
  const districtsQuery = useQuery(
    orpc.masters.listAdministrativeUnits.queryOptions({ input: { type: "DISTRICT", page: 1, limit: 200 } }),
  );
  const typesQuery = useQuery(orpc.masters.listInstrumentTypes.queryOptions({ input: { page: 1, limit: 100 } }));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: orpc.organizations.key() });

  const createGatc = useMutation(orpc.organizations.createGatc.mutationOptions({ onSuccess: invalidate }));
  const inviteStaff = useMutation(orpc.organizations.inviteGatcStaff.mutationOptions({ onSuccess: invalidate }));

  const districts = districtsQuery.data?.items ?? [];
  const types = typesQuery.data?.items ?? [];
  const districtById = new Map(districts.map((d) => [d.id, d.name]));

  function toggle(list: string[], set: (v: string[]) => void, id: string) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function onProvision(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await createGatc.mutateAsync({
        legalName: form.legalName,
        approvalNumber: form.approvalNumber,
        approvalValidFrom: new Date(form.approvalValidFrom).toISOString(),
        approvalValidUntil: new Date(form.approvalValidUntil).toISOString(),
        address: form.address,
        administrativeUnitId: form.administrativeUnitId,
        authorizedTypeIds: authorized,
        serviceAreaIds: serviceAreas,
      });
      setNotice("GATC provisioned.");
      setForm(EMPTY_GATC);
      setAuthorized([]);
      setServiceAreas([]);
    } catch (err) {
      setError(describeError(err));
    }
  }

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const result = await inviteStaff.mutateAsync({
        gatcId: staff.gatcId,
        email: staff.email,
        fullName: staff.fullName,
        phone: staff.phone || undefined,
        role: staff.role,
      });
      if (result.invitationToken) {
        setNotice(
          <>
            Staff invited for {staff.email}. Share this invitation link:{" "}
            <a
              className="break-all font-mono underline"
              href={`/accept-invitation?email=${encodeURIComponent(staff.email)}&token=${encodeURIComponent(result.invitationToken)}`}
            >
              Accept invitation
            </a>
          </>,
        );
      } else {
        setNotice("Staff invited (existing user re-invited).");
      }
      setStaff(EMPTY_STAFF);
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {notice && <p className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">{notice}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowProvision((s) => !s)}>
          {showProvision ? "Close" : "Provision GATC"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowInvite((s) => !s)}>
          {showInvite ? "Close" : "Invite staff"}
        </Button>
      </div>

      {showProvision && (
        <form onSubmit={onProvision} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Legal name">
              <input className={inputClass} value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} required />
            </Field>
            <Field label="Approval number">
              <input className={inputClass} value={form.approvalNumber} onChange={(e) => setForm({ ...form, approvalNumber: e.target.value })} required />
            </Field>
            <Field label="Approval valid from">
              <input className={inputClass} type="date" value={form.approvalValidFrom} onChange={(e) => setForm({ ...form, approvalValidFrom: e.target.value })} required />
            </Field>
            <Field label="Approval valid until">
              <input className={inputClass} type="date" value={form.approvalValidUntil} onChange={(e) => setForm({ ...form, approvalValidUntil: e.target.value })} required />
            </Field>
            <Field label="Address">
              <input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
            </Field>
            <Field label="Location district">
              <select className={inputClass} value={form.administrativeUnitId} onChange={(e) => setForm({ ...form, administrativeUnitId: e.target.value })} required>
                <option value="">Select district…</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <CheckboxGroup
              label="Authorized categories"
              options={types}
              selected={authorized}
              onToggle={(id) => toggle(authorized, setAuthorized, id)}
            />
            <CheckboxGroup
              label="Service areas (districts)"
              options={districts}
              selected={serviceAreas}
              onToggle={(id) => toggle(serviceAreas, setServiceAreas, id)}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={createGatc.isPending}>
              {createGatc.isPending ? "Provisioning…" : "Provision GATC"}
            </Button>
          </div>
        </form>
      )}

      {showInvite && (
        <form onSubmit={onInvite} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="GATC">
              <select className={inputClass} value={staff.gatcId} onChange={(e) => setStaff({ ...staff, gatcId: e.target.value })} required>
                <option value="">Select GATC…</option>
                {data.items.map((g) => (
                  <option key={g.id} value={g.id}>{g.legalName}</option>
                ))}
              </select>
            </Field>
            <Field label="Role">
              <select className={inputClass} value={staff.role} onChange={(e) => setStaff({ ...staff, role: e.target.value as GatcStaffRole })}>
                <option value="MANAGER">Manager</option>
                <option value="OPERATOR">Operator</option>
              </select>
            </Field>
            <Field label="Full name">
              <input className={inputClass} value={staff.fullName} onChange={(e) => setStaff({ ...staff, fullName: e.target.value })} required />
            </Field>
            <Field label="Email">
              <input className={inputClass} type="email" value={staff.email} onChange={(e) => setStaff({ ...staff, email: e.target.value })} required />
            </Field>
            <Field label="Phone (optional)">
              <input className={inputClass} value={staff.phone} onChange={(e) => setStaff({ ...staff, phone: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={inviteStaff.isPending}>
              {inviteStaff.isPending ? "Inviting…" : "Invite staff"}
            </Button>
          </div>
        </form>
      )}

      <DataTable<GatcOutput>
        rows={data.items}
        getRowKey={(r) => r.id}
        emptyTitle="No GATCs provisioned"
        columns={[
          {
            header: "Centre",
            cell: (r) => (
              <div className="flex flex-col">
                <span className="font-medium">{r.legalName}</span>
                <span className="text-xs text-muted-foreground">{r.address}</span>
              </div>
            ),
          },
          { header: "Approval", cell: (r) => <span className="font-mono text-xs">{r.approvalNumber}</span> },
          {
            header: "Valid until",
            cell: (r) => <span className="text-xs">{formatDate(r.approvalValidUntil)}</span>,
          },
          {
            header: "Location",
            cell: (r) => <span className="text-xs">{r.administrativeUnitId ? districtById.get(r.administrativeUnitId) ?? "—" : "—"}</span>,
          },
          { header: "Categories", cell: (r) => <span className="text-xs">{r.authorizedTypeIds.length}</span> },
          { header: "Service areas", cell: (r) => <span className="text-xs">{r.serviceAreaIds.length}</span> },
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
