"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Verify a certificate</h1>
          <p className="text-sm text-muted-foreground">
            Enter a certificate number or instrument code to check its authenticity.
          </p>
        </header>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input
            className={inputClass}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. CERT-2026-0008"
            required
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            Verify
          </button>
        </form>

        <p className="text-xs text-muted-foreground">
          This is a prototype verification service for a demonstration. It is not a government-issued legal
          certificate.
        </p>
      </div>
    </main>
  );
}
