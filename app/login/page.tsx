"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { client } from "@/lib/orpc.client";

const inputClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const session = await client.auth.login({ email, password });
      const roles = session.user.roles;
      let destination = "/field";
      if (roles.includes("INSTRUMENT_OWNER")) destination = "/owner";
      else if (roles.some((r) => ["STATE_ADMIN", "DISTRICT_ADMIN", "SYSTEM_ADMIN", "DEPARTMENT_OFFICIAL"].includes(r))) {
        destination = "/admin";
      }
      router.push(destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="text-sm text-muted-foreground">Access your instrument owner account.</p>
        </div>

        {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Email</span>
          <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Password</span>
          <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-xs text-muted-foreground">
          Demo owner: <span className="font-mono">owner.reliance@retail.in</span> / <span className="font-mono">Demo1234!</span>
        </p>
      </form>
    </div>
  );
}
