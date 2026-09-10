"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { client } from "@/lib/orpc.client";
import { roleHome } from "@/lib/role-home";
import { describeError } from "@/lib/errors";
import { LoginInputSchema, type LoginInput } from "@/modules/auth/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";

const DEMO_LOGINS = [
  { label: "System Admin", icon: "🖥️", email: "admin@metrika.gov.in" },
  { label: "Merchant (Lucknow)", icon: "🛒", email: "owner.bigbazaar@retail.in" },
  { label: "Fuel Merchant (Lucknow)", icon: "⛽", email: "owner.iocl@petro.in" },
  { label: "LMO (Lucknow)", icon: "⚖️", email: "lmo.verma@metrika.gov.in" },
  { label: "LMO (Lucknow 2)", icon: "⚖️", email: "lmo.gupta@metrika.gov.in" },
  { label: "GATC (Lucknow)", icon: "🏢", email: "manager.avadh@gatc.org" },
  { label: "State Admin (UP)", icon: "🏛️", email: "stateadmin.up@metrika.gov.in" },
  { label: "District Admin (Lucknow)", icon: "🏛️", email: "distadmin.lucknow@metrika.gov.in" },
] as const;

const DEMO_PASSWORD = "Demo1234!";

export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginInputSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setPending(true);
    try {
      const session = await client.auth.login(values);
      toast.success(`Signed in as ${session.user.fullName}`);
      router.push(roleHome(session.user.roles));
      router.refresh();
    } catch (err) {
      toast.error(describeError(err));
      setPending(false);
    }
  }

  function fillDemo(email: string) {
    setValue("email", email, { shouldValidate: true });
    setValue("password", DEMO_PASSWORD, { shouldValidate: true });
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="fixed right-4 top-4">
        <ThemeToggle />
      </div>
      <Link href="/" className="text-sm font-semibold">
        Digital Metrology
      </Link>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Access your instruments, applications, and certificates.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
              {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
              {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
            </div>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-xs">
            <Link href="/register" className="text-primary hover:underline">
              Register a business
            </Link>
            <Link href="/verify" className="text-muted-foreground hover:text-foreground">
              Verify a certificate
            </Link>
          </div>
        </CardContent>

        <div className="space-y-2 border-t p-3">
          <span className="block text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            1-click demo logins
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {DEMO_LOGINS.map((demo) => (
              <button
                key={demo.email}
                type="button"
                onClick={() => fillDemo(demo.email)}
                className="rounded-lg border bg-background p-1.5 text-left font-medium transition hover:bg-muted"
              >
                {demo.icon} <strong>{demo.label}</strong>
              </button>
            ))}
          </div>
          <p className="text-center text-[10px] text-muted-foreground">
            All demo accounts use password <span className="font-mono">{DEMO_PASSWORD}</span>
          </p>
        </div>
      </Card>
    </main>
  );
}
