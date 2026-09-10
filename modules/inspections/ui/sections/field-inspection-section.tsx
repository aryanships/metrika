"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { describeError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";
import type { InspectionOutput, ObservationSeverity } from "../../schema";
import type { AttachmentKind, AttachmentOutput } from "@/modules/files/schema";

const inputClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

const SEVERITIES: ObservationSeverity[] = ["INFO", "MINOR", "MAJOR", "NON_COMPLIANCE"];

const REQUIRED_EVIDENCE: { kind: AttachmentKind; label: string }[] = [
  { kind: "INSTRUMENT_FRONT", label: "Instrument front" },
  { kind: "SERIAL_NUMBER", label: "Serial number" },
  { kind: "NAMEPLATE", label: "Nameplate" },
  { kind: "VERIFICATION_AREA", label: "Verification area" },
  { kind: "TEST_SETUP", label: "Test setup" },
];

function errorCode(err: unknown): string | undefined {
  return (err as { code?: string })?.code;
}

function kindLabel(kind: string): string {
  return kind.toLowerCase().replaceAll("_", " ");
}

type ResponseValue = boolean | number | string;
type ObservationInput = { label: string; severity: ObservationSeverity; remarks: string };

function buildResponses(inspection: InspectionOutput): Record<string, ResponseValue> {
  const out: Record<string, ResponseValue> = {};
  for (const item of inspection.template?.items ?? []) {
    if (item.kind === "MEASUREMENT") continue;
    const r = inspection.responses.find((x) => x.templateItemId === item.id);
    const raw = r?.value as ResponseValue | undefined;
    out[item.id] = raw ?? (item.kind === "CHECKLIST" ? false : "");
  }
  return out;
}

type CustomMeasurement = {
  id: string;
  label: string;
  standard: string;
  observed: string;
  unit: string;
};

function buildMeasurements(inspection: InspectionOutput): Record<string, { standard: string; observed: string }> {
  const out: Record<string, { standard: string; observed: string }> = {};
  for (const item of inspection.template?.items ?? []) {
    if (item.kind !== "MEASUREMENT") continue;
    const m = inspection.measurements.find((x) => x.code === item.code);
    const prevResponse = inspection.responses.find((x) => x.templateItemId === item.id);
    let defaultStandard = "";
    if (item.code.includes("ZERO")) {
      defaultStandard = "0.000";
    } else if (item.code.includes("MAX") && inspection.instrument.capacity) {
      defaultStandard = String(inspection.instrument.capacity);
    }
    const defaultObserved =
      m?.observedValue ??
      (prevResponse?.value !== undefined && prevResponse.value !== null ? String(prevResponse.value) : "");
    out[item.id] = {
      standard: m?.standardValue ?? defaultStandard,
      observed: defaultObserved,
    };
  }
  return out;
}

function buildCustomMeasurements(inspection: InspectionOutput): CustomMeasurement[] {
  const templateCodes = new Set(
    (inspection.template?.items ?? []).filter((i) => i.kind === "MEASUREMENT").map((i) => i.code),
  );
  const custom = inspection.measurements.filter((m) => !templateCodes.has(m.code));
  if (custom.length > 0) {
    return custom.map((m, i) => ({
      id: `custom-${i}`,
      label: m.label,
      standard: m.standardValue,
      observed: m.observedValue,
      unit: m.unit ?? inspection.instrument.unit ?? "",
    }));
  }
  const hasTemplateMeasurements = (inspection.template?.items ?? []).some((i) => i.kind === "MEASUREMENT");
  if (!hasTemplateMeasurements) {
    return [
      {
        id: "custom-1",
        label: "Load Accuracy Test",
        standard: inspection.instrument.capacity ? String(inspection.instrument.capacity) : "0.000",
        observed: "",
        unit: inspection.instrument.unit ?? "kg",
      },
    ];
  }
  return [];
}

function calcDeviation(
  standard: string,
  observed: string,
  unit?: string | null,
): { text: string; status: "zero" | "positive" | "negative" } | null {
  const s = parseFloat(standard);
  const o = parseFloat(observed);
  if (isNaN(s) || isNaN(o)) return null;
  const diff = o - s;
  const unitStr = unit ? ` ${unit}` : "";
  if (Math.abs(diff) < 0.000001) {
    return { text: `0.000${unitStr} (Exact)`, status: "zero" };
  }
  const sign = diff > 0 ? "+" : "";
  const formatted = diff.toFixed(4).replace(/\.?0+$/, "");
  return { text: `${sign}${formatted}${unitStr}`, status: diff > 0 ? "positive" : "negative" };
}

function FinalizedView({ inspection }: { inspection: InspectionOutput }) {
  const pass = inspection.result === "PASS";
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-mono text-2xl font-semibold">{inspection.application.code}</h1>
        <span
          className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-sm font-medium ${
            pass ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
          }`}
        >
          Result: {inspection.result}
        </span>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Tolerance breakdown</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Test</th>
                <th className="px-3 py-2 font-medium">Standard</th>
                <th className="px-3 py-2 font-medium">Observed</th>
                <th className="px-3 py-2 font-medium">Permissible error</th>
                <th className="px-3 py-2 font-medium">Observed error</th>
                <th className="px-3 py-2 font-medium">Within limit</th>
              </tr>
            </thead>
            <tbody>
              {inspection.measurements.map((m) => (
                <tr key={m.sequence} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-medium">{m.label}</td>
                  <td className="px-3 py-2 font-mono text-xs">{m.standardValue}</td>
                  <td className="px-3 py-2 font-mono text-xs">{m.observedValue}</td>
                  <td className="px-3 py-2 font-mono text-xs">±{m.permissibleError}</td>
                  <td className="px-3 py-2 font-mono text-xs">{m.observedError}</td>
                  <td className="px-3 py-2 text-xs">{m.withinLimit ? "✓ Yes" : "✗ No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {inspection.observations.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Observations</h2>
          <div className="flex flex-col gap-2">
            {inspection.observations.map((o) => (
              <div key={o.id} className="rounded-lg border border-border bg-card p-3 text-sm">
                <p className="font-medium">{o.label}</p>
                <p className="text-xs text-muted-foreground">{o.severity} · {o.remarks}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function InspectionForm({ inspection, applicationId }: { inspection: InspectionOutput; applicationId: string }) {
  const queryClient = useQueryClient();
  const [responses, setResponses] = useState<Record<string, ResponseValue>>(() => buildResponses(inspection));
  const [measurements, setMeasurements] = useState<Record<string, { standard: string; observed: string }>>(() =>
    buildMeasurements(inspection),
  );
  const [customMeasurements, setCustomMeasurements] = useState<CustomMeasurement[]>(() =>
    buildCustomMeasurements(inspection),
  );
  const [observations, setObservations] = useState<ObservationInput[]>(() =>
    inspection.observations.map((o) => ({ label: o.label, severity: o.severity as ObservationSeverity, remarks: o.remarks })),
  );
  const [notes, setNotes] = useState(inspection.notes ?? "");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [summary, setSummary] = useState<InspectionOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const attachmentsQuery = useQuery(
    orpc.files.listAttachments.queryOptions({ input: { inspectionId: inspection.id } }),
  );
  const attachmentsByKind = (attachmentsQuery.data ?? []).reduce<Record<string, AttachmentOutput>>((acc, att) => {
    acc[att.kind] = att;
    return acc;
  }, {});

  const saveDraft = useMutation(orpc.inspections.saveDraft.mutationOptions());
  const submit = useMutation(
    orpc.inspections.submit.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.inspections.key() });
        queryClient.invalidateQueries({ queryKey: orpc.applications.key() });
      },
    }),
  );

  const items = inspection.template?.items ?? [];
  const measurementItems = items.filter((i) => i.kind === "MEASUREMENT");
  const otherItems = items.filter((i) => i.kind !== "MEASUREMENT");

  function buildResponseList() {
    const list: { templateItemId: string; value: ResponseValue }[] = [];
    for (const item of otherItems) {
      const v = responses[item.id];
      if (item.kind === "CHECKLIST") list.push({ templateItemId: item.id, value: v === true });
      else if (item.kind === "NUMERIC") {
        if (typeof v === "number" && !Number.isNaN(v)) list.push({ templateItemId: item.id, value: v });
      } else if (typeof v === "string" && v.trim() !== "") {
        list.push({ templateItemId: item.id, value: v });
      }
    }
    return list;
  }

  function buildMeasurementList() {
    const list: {
      sequence: number;
      code: string;
      label: string;
      unit?: string;
      standardValue: string;
      observedValue: string;
    }[] = [];

    measurementItems.forEach((item) => {
      const m = measurements[item.id];
      if (m?.standard?.trim() && m?.observed?.trim()) {
        list.push({
          sequence: list.length + 1,
          code: item.code,
          label: item.label,
          unit: item.unit ?? undefined,
          standardValue: m.standard.trim(),
          observedValue: m.observed.trim(),
        });
      }
    });

    customMeasurements.forEach((cm, index) => {
      if (cm.standard.trim() && cm.observed.trim()) {
        list.push({
          sequence: list.length + 1,
          code: `CUSTOM-${index + 1}`,
          label: cm.label.trim() || `Measurement ${list.length + 1}`,
          unit: cm.unit.trim() || inspection.instrument.unit || undefined,
          standardValue: cm.standard.trim(),
          observedValue: cm.observed.trim(),
        });
      }
    });

    return list;
  }

  async function onSaveDraft() {
    setError(null);
    try {
      const result = await saveDraft.mutateAsync({
        applicationId,
        measurements: buildMeasurementList(),
        responses: buildResponseList(),
        observations: observations.map((o) => ({ label: o.label, severity: o.severity, remarks: o.remarks })),
        notes: notes || undefined,
      });
      queryClient.invalidateQueries({ queryKey: orpc.inspections.key() });
      return result;
    } catch (err) {
      setError(describeError(err));
      throw err;
    }
  }

  async function onPrepareSubmit() {
    setError(null);
    const mList = buildMeasurementList();
    if (mList.length === 0) {
      setError("Record at least one measurement (both standard reference and observed values are required) before submitting.");
      return;
    }
    try {
      const result = await onSaveDraft();
      setSummary(result);
      setConfirmOpen(true);
    } catch {
      // error already surfaced by onSaveDraft
    }
  }

  async function onConfirmSubmit() {
    setError(null);
    try {
      await submit.mutateAsync({ applicationId });
      setConfirmOpen(false);
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-mono text-2xl font-semibold">{inspection.application.code}</h1>
        <p className="text-sm text-muted-foreground">
          {inspection.instrument.instrumentCode} · {inspection.instrument.instrumentTypeName} · Serial{" "}
          {inspection.instrument.serialNumber}
        </p>
      </header>

      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Inspection form</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {otherItems.map((item) => {
            const value = responses[item.id];
            return (
              <label key={item.id} className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3">
                <span className="text-xs font-medium text-muted-foreground">
                  {item.label}
                  {item.isRequired ? " *" : ""}
                  {item.unit ? ` (${item.unit})` : ""}
                </span>
                {item.kind === "CHECKLIST" ? (
                  <input
                    type="checkbox"
                    checked={value === true}
                    onChange={(e) => setResponses((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                  />
                ) : item.kind === "NUMERIC" ? (
                  <input
                    className={inputClass}
                    type="number"
                    value={typeof value === "number" ? value : ""}
                    onChange={(e) =>
                      setResponses((prev) => ({
                        ...prev,
                        [item.id]: e.target.value === "" ? "" : Number(e.target.value),
                      }))
                    }
                  />
                ) : (
                  <input
                    className={inputClass}
                    value={typeof value === "string" ? value : ""}
                    onChange={(e) => setResponses((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  />
                )}
              </label>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Verification measurements</h2>
            <p className="text-xs text-muted-foreground">
              Record standard test weight / volume and observed readings. Required for tolerance calculation.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setCustomMeasurements((prev) => [
                ...prev,
                {
                  id: `custom-${Date.now()}`,
                  label: `Test Point ${measurementItems.length + prev.length + 1}`,
                  standard: "",
                  observed: "",
                  unit: inspection.instrument.unit ?? "kg",
                },
              ])
            }
          >
            + Add test point
          </Button>
        </div>

        {measurementItems.length === 0 && customMeasurements.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-4 text-center">
            <p className="text-xs text-muted-foreground">No measurement items defined in template.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() =>
                setCustomMeasurements([
                  {
                    id: `custom-1`,
                    label: "Load Accuracy Test",
                    standard: inspection.instrument.capacity ? String(inspection.instrument.capacity) : "0.000",
                    observed: "",
                    unit: inspection.instrument.unit ?? "kg",
                  },
                ])
              }
            >
              + Add first measurement
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {measurementItems.map((item) => {
            const m = measurements[item.id];
            const dev = calcDeviation(m?.standard ?? "", m?.observed ?? "", item.unit);
            return (
              <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground">
                      {item.unit ?? inspection.instrument.unit ?? "units"}
                    </span>
                    {item.isRequired && <span className="text-xs text-destructive font-medium">*</span>}
                  </div>
                  {dev && (
                    <span
                      className={`text-xs font-mono font-medium px-2 py-0.5 rounded-full ${
                        dev.status === "zero"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      Error: {dev.text}
                    </span>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Standard reference value {item.unit ? `(${item.unit})` : ""}
                    </label>
                    <input
                      className={inputClass}
                      type="number"
                      step="any"
                      placeholder="e.g. 0.000"
                      value={m?.standard ?? ""}
                      onChange={(e) =>
                        setMeasurements((prev) => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], standard: e.target.value },
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Observed instrument reading {item.unit ? `(${item.unit})` : ""}
                    </label>
                    <input
                      className={inputClass}
                      type="number"
                      step="any"
                      placeholder="e.g. 0.002"
                      value={m?.observed ?? ""}
                      onChange={(e) =>
                        setMeasurements((prev) => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], observed: e.target.value },
                        }))
                      }
                      required
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {customMeasurements.map((cm, idx) => {
            const dev = calcDeviation(cm.standard, cm.observed, cm.unit);
            return (
              <div key={cm.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      className="h-7 w-48 rounded border border-border bg-background px-2 text-xs font-medium"
                      placeholder="Measurement label"
                      value={cm.label}
                      onChange={(e) =>
                        setCustomMeasurements((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)),
                        )
                      }
                    />
                    <input
                      className="h-7 w-16 rounded border border-border bg-background px-2 text-xs font-mono"
                      placeholder="Unit"
                      value={cm.unit}
                      onChange={(e) =>
                        setCustomMeasurements((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, unit: e.target.value } : x)),
                        )
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {dev && (
                      <span
                        className={`text-xs font-mono font-medium px-2 py-0.5 rounded-full ${
                          dev.status === "zero"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        Error: {dev.text}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => setCustomMeasurements((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Standard reference value</label>
                    <input
                      className={inputClass}
                      type="number"
                      step="any"
                      placeholder="e.g. 15.000"
                      value={cm.standard}
                      onChange={(e) =>
                        setCustomMeasurements((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, standard: e.target.value } : x)),
                        )
                      }
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Observed reading</label>
                    <input
                      className={inputClass}
                      type="number"
                      step="any"
                      placeholder="e.g. 15.001"
                      value={cm.observed}
                      onChange={(e) =>
                        setCustomMeasurements((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, observed: e.target.value } : x)),
                        )
                      }
                      required
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Observations</h2>
        {observations.map((o, index) => (
          <div key={index} className="grid gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-[1fr_auto_1fr_auto]">
            <input
              className={inputClass}
              placeholder="Observation label"
              value={o.label}
              onChange={(e) => setObservations((prev) => prev.map((x, i) => (i === index ? { ...x, label: e.target.value } : x)))}
              required
            />
            <select
              className={inputClass}
              value={o.severity}
              onChange={(e) =>
                setObservations((prev) => prev.map((x, i) => (i === index ? { ...x, severity: e.target.value as ObservationSeverity } : x)))
              }
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              className={inputClass}
              placeholder="Remarks"
              value={o.remarks}
              onChange={(e) => setObservations((prev) => prev.map((x, i) => (i === index ? { ...x, remarks: e.target.value } : x)))}
              required
            />
            <Button variant="ghost" size="sm" onClick={() => setObservations((prev) => prev.filter((_, i) => i !== index))}>
              Remove
            </Button>
          </div>
        ))}
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setObservations((prev) => [...prev, { label: "", severity: "INFO", remarks: "" }])}
          >
            Add observation
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Evidence</h2>
        <p className="text-xs text-muted-foreground">
          Required: {inspection.evidence.present.length}/{inspection.evidence.required.length} captured.
          {inspection.evidence.complete
            ? " All required photos present."
            : " Missing: " + inspection.evidence.required.filter((k) => !inspection.evidence.present.includes(k)).map(kindLabel).join(", ")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REQUIRED_EVIDENCE.map(({ kind, label }) => (
            <FileUpload
              key={kind}
              kind={kind}
              target={{ inspectionId: inspection.id }}
              accept="image/*"
              capture="environment"
              label={label}
              value={attachmentsByKind[kind]}
              onUploaded={() => {
                queryClient.invalidateQueries({ queryKey: orpc.inspections.key() });
                queryClient.invalidateQueries({ queryKey: orpc.files.key() });
              }}
              onRemoved={() => {
                queryClient.invalidateQueries({ queryKey: orpc.inspections.key() });
                queryClient.invalidateQueries({ queryKey: orpc.files.key() });
              }}
            />
          ))}
          <FileUpload
            kind="INSPECTION_VIDEO"
            target={{ inspectionId: inspection.id }}
            accept="video/*"
            label="Inspection video (optional)"
            value={attachmentsByKind["INSPECTION_VIDEO"]}
            onUploaded={() => {
              queryClient.invalidateQueries({ queryKey: orpc.inspections.key() });
              queryClient.invalidateQueries({ queryKey: orpc.files.key() });
            }}
            onRemoved={() => {
              queryClient.invalidateQueries({ queryKey: orpc.inspections.key() });
              queryClient.invalidateQueries({ queryKey: orpc.files.key() });
            }}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Notes</h2>
        <textarea
          className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Free-form notes about this verification…"
        />
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" disabled={saveDraft.isPending} onClick={onSaveDraft}>
          {saveDraft.isPending ? "Saving…" : "Save draft"}
        </Button>
        <Button disabled={submit.isPending} onClick={onPrepareSubmit}>
          Submit inspection
        </Button>
      </div>

      {confirmOpen && summary && (
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Inspection summary</h2>
          <div className="flex flex-col gap-2">
            {summary.measurements.map((m) => (
              <div key={m.sequence} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span className="font-medium">{m.label}</span>
                <span className={m.withinLimit ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-destructive font-medium"}>
                  error {m.observedError} (limit ±{m.permissibleError}) — {m.withinLimit ? "within limit" : "out of limit"}
                </span>
              </div>
            ))}
            <p className="text-sm">
              Evidence: {summary.evidence.present.length}/{summary.evidence.required.length} photos
              {summary.evidence.complete ? "" : " (required photos missing)"}
            </p>
            <p className="text-sm font-medium">
              Predicted result:{" "}
              <span
                className={`font-semibold ${
                  summary.measurements.length > 0 && summary.measurements.every((m) => m.withinLimit)
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive"
                }`}
              >
                {summary.measurements.length > 0 && summary.measurements.every((m) => m.withinLimit) ? "PASS" : "FAIL"}
              </span>
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button
              disabled={submit.isPending}
              onClick={onConfirmSubmit}
              className={
                summary.measurements.length > 0 && summary.measurements.every((m) => m.withinLimit)
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-destructive hover:bg-destructive/90 text-white"
              }
            >
              {submit.isPending
                ? "Finalizing…"
                : summary.measurements.length > 0 && summary.measurements.every((m) => m.withinLimit)
                ? "Confirm & Finalize (PASS)"
                : "Confirm & Finalize (FAIL)"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function FieldInspectionSection({ applicationId }: { applicationId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery(
    orpc.inspections.get.queryOptions({ input: { applicationId }, retry: false }),
  );

  const start = useMutation(
    orpc.inspections.start.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.inspections.key() }),
    }),
  );

  if (query.isPending) return <p className="text-sm text-muted-foreground">Loading inspection…</p>;

  if (query.error) {
    const notStarted = errorCode(query.error) === "NOT_FOUND";
    return (
      <div className="flex flex-col gap-4">
        {notStarted ? (
          <>
            <p className="text-sm text-muted-foreground">No inspection has been started for this application yet.</p>
            <div>
              <Button disabled={start.isPending} onClick={() => start.mutate({ applicationId })}>
                {start.isPending ? "Starting…" : "Start verification"}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-destructive">{describeError(query.error)}</p>
        )}
        {start.isError && <p className="text-sm text-destructive">{describeError(start.error)}</p>}
      </div>
    );
  }

  const inspection = query.data;
  if (!inspection) return null;

  if (inspection.result) return <FinalizedView inspection={inspection} />;

  return <InspectionForm key={inspection.id} inspection={inspection} applicationId={applicationId} />;
}
