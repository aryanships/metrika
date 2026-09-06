"use client";

import { Suspense, useState } from "react";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-query";
import { describeError } from "@/lib/errors";
import { QueryErrorBoundary } from "@/components/query-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BusinessOutput } from "../../schema";

export function BusinessProfileSection() {
  return (
    <Suspense fallback={<BusinessProfileSkeleton />}>
      <QueryErrorBoundary>
        <BusinessProfileContent />
      </QueryErrorBoundary>
    </Suspense>
  );
}

export function BusinessProfileSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-40 max-w-2xl" />
    </div>
  );
}

function BusinessProfileContent() {
  const { data } = useSuspenseQuery(orpc.businesses.get.queryOptions());

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
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Business profile</CardTitle>
        <CardDescription>One business profile per owner account, used across registrations and certificates.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          {saved && <p className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">Profile saved.</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="businessName">Business name</Label>
              <Input id="businessName" value={form.businessName} onChange={(e) => set("businessName", e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="registrationNumber">Registration number (optional)</Label>
              <Input id="registrationNumber" value={form.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contactPhone">Contact phone</Label>
              <Input id="contactPhone" value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contactEmail">Contact email</Label>
              <Input id="contactEmail" type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} required />
            </div>
          </div>

          <div>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
