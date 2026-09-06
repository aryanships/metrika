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
import { AcceptInvitationInputSchema, type AcceptInvitationInput } from "@/modules/auth/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AcceptInvitationForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptInvitationInput>({
    resolver: zodResolver(AcceptInvitationInputSchema),
    defaultValues: { token, email, fullName: "", password: "" },
  });

  async function onSubmit(values: AcceptInvitationInput) {
    setPending(true);
    try {
      const session = await client.auth.acceptInvitation(values);
      toast.success("Invitation accepted");
      router.push(roleHome(session.user.roles));
      router.refresh();
    } catch (err) {
      toast.error(describeError(err));
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Accept invitation</CardTitle>
        <CardDescription>Activate your account and set a password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" readOnly {...register("email")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="token">Invitation token</Label>
            <Input id="token" readOnly className="font-mono" {...register("token")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" autoComplete="name" placeholder="Your name" {...register("fullName")} />
            {errors.fullName ? <p className="text-xs text-destructive">{errors.fullName.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" {...register("password")} />
            {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Activating…" : "Activate account"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
