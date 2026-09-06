"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { describeError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";
import type { InspectionOutput, ObservationSeverity } from "../../schema";
import type { AttachmentKind } from "@/modules/files/schema";

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

function buildMeasurements(inspection: InspectionOutput): Record<string, { standard: string; observed: string }> {
  const out: Record<string, { standard: string; observed: string }> = {};
  for (const item of inspection.template?.items ?? []) {
    if (item.kind !== "MEASUREMENT") continue;
    const m = inspection.measurements.find((x) => x.code === item.code);
    out[item.id] = { standard: m?.standardValue ?? "", observed: m?.observedValue ?? "" };
  }
  return out;
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
  const [observations, setObservations] = useState<ObservationInput[]>(() =>
    inspection.observations.map((o) => ({ label: o.label, severity: o.severity as ObservationSeverity, remarks: o.remarks })),
  );
  const [notes, setNotes] = useState(inspection.notes ?? "");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [summary, setSummary] = useState<InspectionOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveDraft = useMutation(orpc.inspections.saveDraft.mutationOptions());
  const submit = useMutation(
    orpc.inspections.submit.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.inspections.key() }),
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
    return measurementItems
      .map((item, index) => {
        const m = measurements[item.id];
        return {
          sequence: index + 1,
          code: item.code,
          label: item.label,
          unit: item.unit ?? undefined,
          standardValue: m?.standard ?? "",
          observedValue: m?.observed ?? "",
        };
      })
      .filter((m) => m.standardValue !== "" && m.observedValue !== "");
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

        {measurementItems.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Measurements</h3>
            {measurementItems.map((item) => {
              const m = measurements[item.id];
              return (
                <div key={item.id} className="grid gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {item.label} — standard {item.unit ? `(${item.unit})` : ""}
                    </span>
                    <input
                      className={inputClass}
                      value={m?.standard ?? ""}
                      onChange={(e) =>
                        setMeasurements((prev) => ({ ...prev, [item.id]: { ...prev[item.id], standard: e.target.value } }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Observed</span>
                    <input
                      className={inputClass}
                      value={m?.observed ?? ""}
                      onChange={(e) =>
                        setMeasurements((prev) => ({ ...prev, [item.id]: { ...prev[item.id], observed: e.target.value } }))
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
              onUploaded={() => queryClient.invalidateQueries({ queryKey: orpc.inspections.key() })}
            />
          ))}
          <FileUpload
            kind="INSPECTION_VIDEO"
            target={{ inspectionId: inspection.id }}
            accept="video/*"
            label="Inspection video (optional)"
            onUploaded={() => queryClient.invalidateQueries({ queryKey: orpc.inspections.key() })}
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
                <span className={m.withinLimit ? "text-emerald-600" : "text-destructive"}>
                  error {m.observedError} (limit ±{m.permissibleError}) — {m.withinLimit ? "within limit" : "out of limit"}
                </span>
              </div>
            ))}
            <p className="text-sm">
              Evidence: {summary.evidence.present.length}/{summary.evidence.required.length} photos
              {summary.evidence.complete ? "" : " (required photos missing)"}
            </p>
            <p className="text-sm font-medium">
              Predicted result: {summary.measurements.every((m) => m.withinLimit) ? "PASS" : "FAIL"}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={submit.isPending} onClick={onConfirmSubmit}>
              {submit.isPending ? "Finalizing…" : "Confirm & finalize"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function FieldInspectionSection({ applicationId }: { applicationId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery(orpc.inspections.get.queryOptions({ input: { applicationId } }));

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
