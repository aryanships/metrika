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

export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
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

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
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
      </Card>

      <p className="max-w-sm text-center text-xs text-muted-foreground">
        Demo owner: <span className="font-mono">owner.reliance@retail.in</span> /{" "}
        <span className="font-mono">Demo1234!</span>
      </p>
    </main>
  );
}
