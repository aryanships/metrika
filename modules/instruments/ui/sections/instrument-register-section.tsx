"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { describeError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";
import type { AttachmentOutput } from "@/modules/files/schema";

const inputClass =
  "flex h-9 w-full rounded-md border border-input bg-input/20 px-3 py-1 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50";

const selectClass = `${inputClass} bg-background`;

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

const PHOTO_KINDS = [
  { kind: "INSTRUMENT_FRONT", label: "Instrument front" },
  { kind: "SERIAL_NUMBER", label: "Serial number" },
  { kind: "NAMEPLATE", label: "Nameplate" },
  { kind: "CONDITION", label: "Current condition" },
] as const;

const DOCUMENT_KINDS = [
  { kind: "PREVIOUS_CERTIFICATE", label: "Previous certificate" },
  { kind: "PURCHASE_DOCUMENT", label: "Purchase document" },
  { kind: "APPROVAL_DOCUMENT", label: "Approval / model document" },
] as const;

const EMPTY = {
  instrumentTypeId: "",
  manufacturer: "",
  model: "",
  serialNumber: "",
  capacity: "",
  accuracyClass: "",
  yearOfManufacture: "",
  purchaseDate: "",
  stateId: "",
  districtId: "",
  tehsilId: "",
  villageId: "",
  address: "",
  postalCode: "",
  latitude: "",
  longitude: "",
};

export function InstrumentRegisterSection() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<AttachmentOutput[]>([]);

  const typesQuery = useQuery(orpc.masters.listInstrumentTypes.queryOptions({ input: { page: 1, limit: 100 } }));
  const statesQuery = useQuery(orpc.masters.listAdministrativeUnits.queryOptions({ input: { type: "STATE", page: 1, limit: 100 } }));
  const districtsQuery = useQuery(
    orpc.masters.listAdministrativeUnits.queryOptions({
      input: { type: "DISTRICT", parentId: form.stateId, page: 1, limit: 100 },
      enabled: !!form.stateId,
    }),
  );
  const tehsilsQuery = useQuery(
    orpc.masters.listAdministrativeUnits.queryOptions({
      input: { type: "TEHSIL", parentId: form.districtId, page: 1, limit: 100 },
      enabled: !!form.districtId,
    }),
  );
  const villagesQuery = useQuery(
    orpc.masters.listAdministrativeUnits.queryOptions({
      input: { type: "VILLAGE", parentId: form.tehsilId, page: 1, limit: 100 },
      enabled: !!form.tehsilId,
    }),
  );

  const create = useMutation(orpc.instruments.create.mutationOptions());

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function selectUnit(key: "stateId" | "districtId" | "tehsilId" | "villageId", value: string) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "stateId") return { ...next, districtId: "", tehsilId: "", villageId: "" };
      if (key === "districtId") return { ...next, tehsilId: "", villageId: "" };
      if (key === "tehsilId") return { ...next, villageId: "" };
      return next;
    });
  }

  const administrativeUnitId = form.villageId || form.tehsilId || form.districtId || form.stateId;

  function step1Valid() {
    return form.instrumentTypeId && form.manufacturer && form.model && form.serialNumber && form.capacity && form.accuracyClass;
  }

  function step2Valid() {
    return !!form.stateId && !!administrativeUnitId && !!form.address;
  }

  async function nextFromIdentification() {
    if (!step1Valid()) {
      setError("Complete all required identification fields.");
      return;
    }
    setError(null);
    setStep(2);
  }

  async function createAndContinue() {
    if (!step2Valid()) {
      setError("Select a location and enter the installation address.");
      return;
    }
    setError(null);
    try {
      const created = await create.mutateAsync({
        instrumentTypeId: form.instrumentTypeId,
        manufacturer: form.manufacturer,
        model: form.model,
        serialNumber: form.serialNumber,
        capacity: form.capacity,
        accuracyClass: form.accuracyClass,
        yearOfManufacture: form.yearOfManufacture ? Number(form.yearOfManufacture) : undefined,
        purchaseDate: form.purchaseDate || undefined,
        address: form.address,
        administrativeUnitId,
        postalCode: form.postalCode || undefined,
        latitude: form.latitude || undefined,
        longitude: form.longitude || undefined,
      });
      setCreatedId(created.id);
      setStep(3);
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {["Identification", "Location", "Documents & photos"].map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <div key={label} className="flex items-center gap-2">
              <span
                className={`flex size-5 items-center justify-center rounded-full text-[0.625rem] font-medium ${
                  active ? "bg-primary text-primary-foreground" : done ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? "✓" : n}
              </span>
              <span className={active ? "font-medium text-foreground" : ""}>{label}</span>
              {n < 3 && <span className="text-muted-foreground/50">→</span>}
            </div>
          );
        })}
      </div>

      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Instrument type">
              <select className={selectClass} value={form.instrumentTypeId} onChange={(e) => set("instrumentTypeId", e.target.value)} required>
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
          <div className="flex justify-end">
            <Button onClick={nextFromIdentification}>Continue</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="State">
              <select className={selectClass} value={form.stateId} onChange={(e) => selectUnit("stateId", e.target.value)} required>
                <option value="">Select state…</option>
                {(statesQuery.data?.items ?? []).map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </Field>
            <Field label="District">
              <select className={selectClass} value={form.districtId} onChange={(e) => selectUnit("districtId", e.target.value)} disabled={!form.stateId} required>
                <option value="">Select district…</option>
                {(districtsQuery.data?.items ?? []).map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Tehsil">
              <select className={selectClass} value={form.tehsilId} onChange={(e) => selectUnit("tehsilId", e.target.value)} disabled={!form.districtId}>
                <option value="">Select tehsil…</option>
                {(tehsilsQuery.data?.items ?? []).map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Village / Town" optional>
              <select className={selectClass} value={form.villageId} onChange={(e) => selectUnit("villageId", e.target.value)} disabled={!form.tehsilId}>
                <option value="">Select village…</option>
                {(villagesQuery.data?.items ?? []).map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
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
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={createAndContinue} disabled={create.isPending}>
              {create.isPending ? "Registering…" : "Register & continue"}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && createdId && (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            Instrument registered. Upload supporting documents and photos (optional, can be added later).
          </p>
          <div>
            <h3 className="text-sm font-semibold">Photos</h3>
            <p className="text-xs text-muted-foreground">Front, serial number, nameplate, and current condition.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {PHOTO_KINDS.map(({ kind, label }) => (
                <FileUpload
                  key={kind}
                  kind={kind}
                  target={{ instrumentId: createdId }}
                  accept="image/*"
                  capture="environment"
                  label={label}
                  onUploaded={(a) => setUploaded((list) => [...list, a])}
                />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Documents</h3>
            <p className="text-xs text-muted-foreground">Previous certificate, purchase document, and approval documents.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {DOCUMENT_KINDS.map(({ kind, label }) => (
                <FileUpload
                  key={kind}
                  kind={kind}
                  target={{ instrumentId: createdId }}
                  accept="application/pdf,image/*"
                  label={label}
                  onUploaded={(a) => setUploaded((list) => [...list, a])}
                />
              ))}
            </div>
          </div>
          {uploaded.length > 0 && (
            <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
              {uploaded.map((a) => (
                <li key={a.id}>✓ {a.fileName}</li>
              ))}
            </ul>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={() => { router.push(`/business/instruments/${createdId}`); router.refresh(); }}>
              View digital passport
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
