"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScanLineIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function VerifySearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = query.trim();
    if (!code) return;
    router.push(`/verify/c/${encodeURIComponent(code)}`);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <Link href="/" className="text-sm font-semibold">
        Digital Metrology
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verify a certificate</CardTitle>
          <CardDescription>
            Enter a certificate number or instrument code to check its authenticity against the
            official record.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="query">Certificate or instrument code</Label>
              <Input
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. CERT-2026-0008"
                className="font-mono"
              />
            </div>
            <Button type="submit" className="w-full">
              <ScanLineIcon />
              Verify
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="max-w-sm text-center text-xs text-muted-foreground">
        This is a prototype verification service for a demonstration. It is not a government-issued
        legal certificate.
      </p>
    </main>
  );
}
