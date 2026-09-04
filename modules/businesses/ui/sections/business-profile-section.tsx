"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import type { BusinessOutput } from "../../schema";

const inputClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

function Field({ label, children, optional }: { label: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
        {optional && <span className="text-muted-foreground/70"> (optional)</span>}
      </span>
      {children}
    </label>
  );
}

function describeError(e: unknown): string {
  if (e instanceof Error) {
    const data = (e as Error & { data?: { message?: string } }).data;
    if (data?.message) return data.message;
    return e.message;
  }
  return "Something went wrong";
}

export function BusinessProfileSection() {
  const { data, isPending, error } = useQuery(orpc.businesses.get.queryOptions());

  if (isPending) return <p className="text-sm text-muted-foreground">Loading profile…</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load profile.</p>;

  return <BusinessForm initial={data ?? null} />;
}

function BusinessForm({ initial }: { initial: BusinessOutput | null }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    businessName: initial?.businessName ?? "",
    registrationNumber: initial?.registrationNumber ?? "",
    contactPhone: initial?.contactPhone ?? "",
    contactEmail: initial?.contactEmail ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = useMutation(
    orpc.businesses.save.mutationOptions({
      onSuccess: () => {
        setSaved(true);
        queryClient.invalidateQueries({ queryKey: orpc.businesses.key() });
      },
    }),
  );

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await save.mutateAsync({
        businessName: form.businessName,
        registrationNumber: form.registrationNumber || undefined,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail,
      });
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-6">
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {saved && <p className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">Profile saved.</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name">
          <input className={inputClass} value={form.businessName} onChange={(e) => set("businessName", e.target.value)} required />
        </Field>
        <Field label="Registration number" optional>
          <input className={inputClass} value={form.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)} />
        </Field>
        <Field label="Contact phone">
          <input className={inputClass} value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} required />
        </Field>
        <Field label="Contact email">
          <input className={inputClass} type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} required />
        </Field>
      </div>

      <div>
        <button
          type="submit"
          disabled={save.isPending}
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
        >
          {save.isPending ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
