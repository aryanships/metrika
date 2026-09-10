"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QrCodeIcon, ScanLineIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrScannerModal } from "@/components/qr-scanner-modal";
import { ThemeToggle } from "@/components/theme-toggle";

const EXAMPLES = [
  { code: "CERT-2026-0008", label: "Active", tone: "emerald" },
  { code: "CERT-2024-0001", label: "Expired", tone: "rose" },
] as const;

export default function VerifySearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);

  function go(code: string) {
    router.push(`/verify/c/${encodeURIComponent(code)}`);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = query.trim();
    if (!code) return;
    go(code);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="fixed right-4 top-4">
        <ThemeToggle />
      </div>
      <Link href="/" className="text-sm font-semibold">
        Digital Metrology
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verify a certificate</CardTitle>
          <CardDescription>
            Enter a certificate number or scan the QR code to check its authenticity against the
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
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                <ScanLineIcon />
                Verify
              </Button>
              <Button type="button" variant="outline" onClick={() => setScannerOpen(true)}>
                <QrCodeIcon className="text-primary" />
                Scan QR
              </Button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t pt-4 text-xs">
            <span className="text-muted-foreground">Try an example:</span>
            {EXAMPLES.map((example) => (
              <button
                key={example.code}
                type="button"
                onClick={() => go(example.code)}
                className={`rounded-md border px-2 py-0.5 font-mono text-[11px] transition ${
                  example.tone === "emerald"
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                    : "border-rose-500/20 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                }`}
              >
                {example.code} ({example.label})
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="max-w-sm text-center text-xs text-muted-foreground">
        This is a prototype verification service for a demonstration. It is not a government-issued
        legal certificate.
      </p>

      <QrScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={go} />
    </main>
  );
}
