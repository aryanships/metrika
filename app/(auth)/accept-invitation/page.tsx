import Link from "next/link";
import { AcceptInvitationForm } from "@/modules/auth/ui/accept-invitation-form";

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <Link href="/" className="text-sm font-semibold">
        Digital Metrology
      </Link>
      <AcceptInvitationForm token={token ?? ""} email={email ?? ""} />
    </main>
  );
}
