"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";

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

interface FormState {
  instrumentTypeId: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  capacity: string;
  accuracyClass: string;
  yearOfManufacture: string;
  purchaseDate: string;
  address: string;
  administrativeUnitId: string;
  postalCode: string;
  latitude: string;
  longitude: string;
}

const INITIAL: FormState = {
  instrumentTypeId: "",
  manufacturer: "",
  model: "",
  serialNumber: "",
  capacity: "",
  accuracyClass: "",
  yearOfManufacture: "",
  purchaseDate: "",
  address: "",
  administrativeUnitId: "",
  postalCode: "",
  latitude: "",
  longitude: "",
};

export function InstrumentRegisterSection() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState<string | null>(null);

  const typesQuery = useQuery(orpc.masters.listInstrumentTypes.queryOptions({ input: { page: 1, limit: 100 } }));
  const unitsQuery = useQuery(
    orpc.masters.listAdministrativeUnits.queryOptions({ input: { page: 1, limit: 100 } }),
  );

  const create = useMutation(
    orpc.instruments.create.mutationOptions({
      onSuccess: (created) => {
        router.push(`/owner/instruments/${created.id}`);
        router.refresh();
      },
    }),
  );

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({
        instrumentTypeId: form.instrumentTypeId,
        manufacturer: form.manufacturer,
        model: form.model,
        serialNumber: form.serialNumber,
        capacity: form.capacity,
        accuracyClass: form.accuracyClass,
        yearOfManufacture: form.yearOfManufacture ? Number(form.yearOfManufacture) : undefined,
        purchaseDate: form.purchaseDate || undefined,
        address: form.address,
        administrativeUnitId: form.administrativeUnitId,
        postalCode: form.postalCode || undefined,
        latitude: form.latitude || undefined,
        longitude: form.longitude || undefined,
      });
    } catch (err) {
      setError(describeError(err));
    }
  }

  const unitOptions = (unitsQuery.data?.items ?? []).filter(
    (u) => u.type === "VILLAGE" || u.type === "TEHSIL",
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Identification</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Instrument type">
            <select
              className={inputClass}
              value={form.instrumentTypeId}
              onChange={(e) => set("instrumentTypeId", e.target.value)}
              required
            >
              <option value="">Select type…</option>
              {(typesQuery.data?.items ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.unit})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Manufacturer">
            <input className={inputClass} value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} required />
          </Field>
          <Field label="Model">
            <input className={inputClass} value={form.model} onChange={(e) => set("model", e.target.value)} required />
          </Field>
          <Field label="Serial number">
            <input className={inputClass} value={form.serialNumber} onChange={(e) => set("serialNumber", e.target.value)} required />
          </Field>
          <Field label="Capacity">
            <input className={inputClass} value={form.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="e.g. 30" required />
          </Field>
          <Field label="Accuracy class">
            <input className={inputClass} value={form.accuracyClass} onChange={(e) => set("accuracyClass", e.target.value)} placeholder="e.g. Class III" required />
          </Field>
          <Field label="Year of manufacture" optional>
            <input className={inputClass} type="number" value={form.yearOfManufacture} onChange={(e) => set("yearOfManufacture", e.target.value)} />
          </Field>
          <Field label="Purchase date" optional>
            <input className={inputClass} type="date" value={form.purchaseDate} onChange={(e) => set("purchaseDate", e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Location</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Village / Town / Tehsil">
            <select
              className={inputClass}
              value={form.administrativeUnitId}
              onChange={(e) => set("administrativeUnitId", e.target.value)}
              required
            >
              <option value="">Select location…</option>
              {unitOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.type})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Installation address">
            <input className={inputClass} value={form.address} onChange={(e) => set("address", e.target.value)} required />
          </Field>
          <Field label="Postal code" optional>
            <input className={inputClass} value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
          </Field>
          <Field label="Latitude" optional>
            <input className={inputClass} value={form.latitude} onChange={(e) => set("latitude", e.target.value)} />
          </Field>
          <Field label="Longitude" optional>
            <input className={inputClass} value={form.longitude} onChange={(e) => set("longitude", e.target.value)} />
          </Field>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <button type="button" className="rounded-md px-3 py-1.5 text-sm hover:bg-muted" onClick={() => router.back()}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
        >
          {create.isPending ? "Registering…" : "Register instrument"}
        </button>
      </div>
    </form>
  );
}
