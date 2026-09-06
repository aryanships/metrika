"use client";

import { Suspense, useState } from "react";
import { useMutation, useQuery, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { describeError } from "@/lib/errors";
import { QueryErrorBoundary } from "@/components/query-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Field, inputClass } from "@/modules/masters/ui/field";
import type { AdminRole, AdminAccountOutput } from "../../schema";

const ADMIN_ROLES: AdminRole[] = ["SYSTEM_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN", "DEPARTMENT_OFFICIAL"];

const SCOPE_TYPE: Partial<Record<AdminRole, "STATE" | "DISTRICT">> = {
  STATE_ADMIN: "STATE",
  DISTRICT_ADMIN: "DISTRICT",
};

const EMPTY = { email: "", fullName: "", phone: "", role: "STATE_ADMIN" as AdminRole };

export function AdminAccountsSection() {
  return (
    <Suspense fallback={<AdminAccountsSkeleton />}>
      <QueryErrorBoundary>
        <AdminAccountsContent />
      </QueryErrorBoundary>
    </Suspense>
  );
}

export function AdminAccountsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function AdminAccountsContent() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [scopes, setScopes] = useState<string[]>([]);
  const [editingScopes, setEditingScopes] = useState<AdminAccountOutput | null>(null);
  const [scopeSelection, setScopeSelection] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<string | null>(null);

  const { data } = useSuspenseQuery(orpc.organizations.listAdmins.queryOptions({ input: { page: 1, limit: 100 } }));
  const unitsQuery = useQuery(orpc.masters.listAdministrativeUnits.queryOptions({ input: { page: 1, limit: 100 } }));

  const provision = useMutation(
    orpc.organizations.provisionAdmin.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.organizations.key() }),
    }),
  );
  const setAdminScopes = useMutation(
    orpc.organizations.setAdminScopes.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.organizations.key() }),
    }),
  );

  const units = unitsQuery.data?.items ?? [];
  const scopeType = SCOPE_TYPE[form.role];
  const scopeOptions = scopeType ? units.filter((u) => u.type === scopeType) : [];

  function eligibleUnits(account: AdminAccountOutput) {
    const types = new Set(account.roles.map((r) => SCOPE_TYPE[r]).filter(Boolean));
    return units.filter((u) => types.has(u.type as "STATE" | "DISTRICT"));
  }

  function toggle(list: string[], set: (v: string[]) => void, id: string) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function onProvision(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const created = await provision.mutateAsync({
        email: form.email,
        fullName: form.fullName,
        phone: form.phone || undefined,
        role: form.role,
        scopeAdministrativeUnitIds: scopes,
      });
      setInvitation(created.invitationToken);
      setForm(EMPTY);
      setScopes([]);
    } catch (err) {
      setError(describeError(err));
    }
  }

  async function onSaveScopes() {
    if (!editingScopes) return;
    setError(null);
    try {
      await setAdminScopes.mutateAsync({ userId: editingScopes.userId, administrativeUnitIds: scopeSelection });
      setEditingScopes(null);
    } catch (err) {
      setError(describeError(err));
    }
  }

  function openScopeEditor(account: AdminAccountOutput) {
    setEditingScopes(account);
    setScopeSelection(account.scopeAdministrativeUnitIds);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {invitation && (
        <div className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          <p className="font-medium">Account provisioned. Share this one-time invitation token:</p>
          <p className="mt-1 break-all font-mono">{invitation}</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => { setOpen((s) => !s); setInvitation(null); }}>
          {open ? "Close" : "Provision admin"}
        </Button>
      </div>

      {open && (
        <form onSubmit={onProvision} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
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
            <Field label="Role">
              <select className={inputClass} value={form.role} onChange={(e) => { setForm({ ...form, role: e.target.value as AdminRole }); setScopes([]); }}>
                {ADMIN_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>
          </div>

          {scopeOptions.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Scope ({scopeType}s)</span>
              <div className="flex max-h-40 flex-col gap-1 overflow-auto rounded-md border border-input p-2">
                {scopeOptions.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={scopes.includes(u.id)} onChange={() => toggle(scopes, setScopes, u.id)} />
                    {u.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={provision.isPending}>
              {provision.isPending ? "Provisioning…" : "Provision"}
            </Button>
          </div>
        </form>
      )}

      <DataTable<AdminAccountOutput>
        rows={data.items}
        getRowKey={(a) => a.userId}
        emptyTitle="No admin accounts"
        columns={[
          {
            header: "Account",
            cell: (a) => (
              <div className="flex flex-col">
                <span className="font-medium">{a.fullName}</span>
                <span className="text-xs text-muted-foreground">{a.email}</span>
              </div>
            ),
          },
          {
            header: "Roles",
            cell: (a) => (
              <div className="flex flex-wrap gap-1">
                {a.roles.map((r) => (
                  <span key={r} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{r}</span>
                ))}
              </div>
            ),
          },
          { header: "Scopes", cell: (a) => <span className="text-xs">{a.scopeAdministrativeUnitIds.length}</span> },
          {
            header: "Status",
            cell: (a) => (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.isActive ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                {a.isActive ? "Active" : "Inactive"}
              </span>
            ),
          },
          {
            header: "Actions",
            cell: (a) =>
              a.roles.some((r) => SCOPE_TYPE[r]) ? (
                <Button variant="ghost" size="sm" onClick={() => openScopeEditor(a)}>Set scopes</Button>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              ),
          },
        ]}
      />

      {editingScopes && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium">Scopes for {editingScopes.fullName}</p>
          {eligibleUnits(editingScopes).length > 0 ? (
            <div className="flex max-h-56 flex-col gap-1 overflow-auto rounded-md border border-input p-2">
              {eligibleUnits(editingScopes).map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={scopeSelection.includes(u.id)}
                    onChange={() => toggle(scopeSelection, setScopeSelection, u.id)}
                  />
                  {u.name} <span className="text-xs text-muted-foreground">({u.type})</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">This role has no scoped units.</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingScopes(null)}>Cancel</Button>
            <Button size="sm" disabled={setAdminScopes.isPending} onClick={onSaveScopes}>Save scopes</Button>
          </div>
        </div>
      )}
    </div>
  );
}
