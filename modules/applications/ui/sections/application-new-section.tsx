"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { describeError } from "@/lib/errors";
import { toIsoDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { ApplicationType } from "../../schema";

const inputClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

const TYPES: { value: ApplicationType; label: string; hint: string }[] = [
  { value: "INITIAL_VERIFICATION", label: "Initial verification", hint: "First verification of a new instrument" },
  { value: "RE_VERIFICATION", label: "Re-verification", hint: "Renew an expiring or expired certificate" },
  { value: "POST_REPAIR_VERIFICATION", label: "Post-repair verification", hint: "Verify after a repair" },
  { value: "RELOCATION_RE_VERIFICATION", label: "Relocation re-verification", hint: "Verify after moving the instrument" },
  { value: "OWNERSHIP_TRANSFER", label: "Ownership transfer", hint: "Transfer to a new owner" },
  { value: "CERTIFICATE_CORRECTION", label: "Certificate correction", hint: "Correct a certificate detail" },
  { value: "DUPLICATE_CERTIFICATE", label: "Duplicate certificate", hint: "Request a duplicate copy" },
];

const NEEDS_TARGET_CERT = new Set<ApplicationType>(["CERTIFICATE_CORRECTION", "DUPLICATE_CERTIFICATE"]);

export function ApplicationNewSection({
  initialInstrumentId,
  initialType,
}: {
  initialInstrumentId?: string;
  initialType?: ApplicationType;
}) {
  const router = useRouter();
  const [type, setType] = useState<ApplicationType>(initialType ?? "INITIAL_VERIFICATION");
  const [instrumentId, setInstrumentId] = useState(initialInstrumentId ?? "");
  const [targetCertificateId, setTargetCertificateId] = useState("");
  const [preferredStartAt, setPreferredStartAt] = useState("");
  const [preferredEndAt, setPreferredEndAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const instrumentsQuery = useQuery(orpc.instruments.list.queryOptions({ input: { page: 1, limit: 100 } }));
  const certificatesQuery = useQuery(
    orpc.certificates.listMine.queryOptions({
      input: { page: 1, limit: 100, instrumentId },
      enabled: NEEDS_TARGET_CERT.has(type) && !!instrumentId,
    }),
  );

  const create = useMutation(orpc.applications.createDraft.mutationOptions());

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const created = await create.mutateAsync({
        instrumentId,
        type,
        targetCertificateId: targetCertificateId || undefined,
        preferredStartAt: toIsoDateTime(preferredStartAt),
        preferredEndAt: toIsoDateTime(preferredEndAt),
      });
      router.push(`/business/applications/${created.id}`);
      router.refresh();
    } catch (err) {
      setError(describeError(err));
    }
  }

  const instruments = instrumentsQuery.data?.items ?? [];

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Application type</CardTitle>
          <CardDescription>What do you need to do with this instrument?</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {TYPES.map((t) => (
            <label
              key={t.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                type === t.value ? "border-primary bg-muted/40" : "border-border hover:bg-muted/40"
              }`}
            >
              <input
                type="radio"
                name="type"
                checked={type === t.value}
                onChange={() => setType(t.value)}
                className="mt-0.5"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{t.label}</span>
                <span className="text-xs text-muted-foreground">{t.hint}</span>
              </span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instrument & schedule</CardTitle>
          <CardDescription>Choose the instrument and an optional preferred appointment window.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="instrument">Instrument</Label>
            <select id="instrument" className={inputClass} value={instrumentId} onChange={(e) => setInstrumentId(e.target.value)} required>
              <option value="">Select instrument…</option>
              {instruments.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.instrumentCode} — {i.instrumentTypeName} ({i.serialNumber})
                </option>
              ))}
            </select>
          </div>

          {NEEDS_TARGET_CERT.has(type) && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="targetCertificate">Target certificate</Label>
              <select
                id="targetCertificate"
                className={inputClass}
                value={targetCertificateId}
                onChange={(e) => setTargetCertificateId(e.target.value)}
                required
              >
                <option value="">Select certificate…</option>
                {(certificatesQuery.data?.items ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.certificateCode} · {c.status}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="preferredStartAt">Preferred start (optional)</Label>
              <input
                id="preferredStartAt"
                type="datetime-local"
                className={inputClass}
                value={preferredStartAt}
                onChange={(e) => setPreferredStartAt(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="preferredEndAt">Preferred end (optional)</Label>
              <input
                id="preferredEndAt"
                type="datetime-local"
                className={inputClass}
                value={preferredEndAt}
                onChange={(e) => setPreferredEndAt(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create application"}
        </Button>
      </div>
    </form>
  );
}
