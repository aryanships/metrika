import Link from "next/link";
import {
  ArrowRightIcon,
  ClipboardCheckIcon,
  FileCheck2Icon,
  GaugeIcon,
  QrCodeIcon,
  RefreshCwIcon,
  ScanLineIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: FileCheck2Icon,
    title: "Digital Metrology Passport",
    description: "Every instrument keeps a permanent, tamper-evident lifecycle from registration through re-verification.",
  },
  {
    icon: UsersIcon,
    title: "Smart officer assignment",
    description: "Workload, expertise, proximity and urgency drive the recommendation — the admin always decides.",
  },
  {
    icon: GaugeIcon,
    title: "Rule-based verification",
    description: "Configurable tolerance rules compute permissible vs observed error, so pass/fail is explainable.",
  },
  {
    icon: ClipboardCheckIcon,
    title: "Evidence-based verification",
    description: "Photos, measurements and a full audit trail are linked to every inspection and certificate.",
  },
  {
    icon: QrCodeIcon,
    title: "Public QR verification",
    description: "Anyone can scan a certificate QR and confirm authenticity against the official record.",
  },
  {
    icon: RefreshCwIcon,
    title: "Expiry lifecycle",
    description: "Reminders and one-click re-verification keep instruments compliant before certificates lapse.",
  },
];

const ROLES = [
  {
    title: "Instrument owners",
    description: "Register instruments, submit verification applications, track certificates and renewals.",
    href: "/register",
    cta: "Register",
  },
  {
    title: "Legal Metrology Officers",
    description: "Conduct field verification, record measurements and evidence, submit pass/fail results.",
    href: "/accept-invitation",
    cta: "Activate invite",
  },
  {
    title: "GATC centres",
    description: "Authorized testing centres verify instruments within their approved scope and service area.",
    href: "/accept-invitation",
    cta: "Activate invite",
  },
  {
    title: "Administrators",
    description: "Review, assign, schedule, issue certificates and manage master data and users.",
    href: "/login",
    cta: "Sign in",
  },
];

const LIFECYCLE = ["Register", "Apply", "Screen", "Schedule", "Verify", "Certify", "QR check", "Renew"];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-sm font-semibold">Digital Metrology</span>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/verify" className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground">
              Verify
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden sm:inline-flex")}
            >
              Sign in
            </Link>
            <Link href="/register" className={buttonVariants({ size: "sm" })}>
              Register
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="border-b border-border bg-gradient-to-b from-muted/40 to-transparent">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:py-24">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Legal Metrology · Online Verification
            </p>
            <h1 className="max-w-3xl text-balance text-3xl font-bold leading-tight sm:text-5xl">
              A digital lifecycle for every measuring instrument
            </h1>
            <p className="max-w-2xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
              A digital lifecycle management platform for Legal Metrology instruments that connects
              businesses, LMOs, GATCs and administrators from registration and verification through
              certification, public authentication, expiry management and re-verification.
            </p>
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <Link href="/verify" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}>
                <ScanLineIcon />
                Verify a certificate
              </Link>
              <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
                Register your business
                <ArrowRightIcon />
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold sm:text-2xl">Built for the full instrument lifecycle</h2>
            <p className="text-sm text-muted-foreground">
              Not just an online form — a single source of truth from registration to re-verification.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-xl border border-border bg-card p-5">
                <feature.icon className="size-5 text-primary" />
                <h3 className="mt-3 text-sm font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <h2 className="text-xl font-bold sm:text-2xl">How it works</h2>
            <ol className="mt-8 grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
              {LIFECYCLE.map((step, index) => (
                <li key={step} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
                  <span className="font-mono text-muted-foreground">{index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <h2 className="text-xl font-bold sm:text-2xl">Who it&apos;s for</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((role) => (
              <div key={role.title} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold">{role.title}</h3>
                <p className="flex-1 text-xs leading-relaxed text-muted-foreground">{role.description}</p>
                <Link href={role.href} className="text-xs font-medium text-primary hover:underline">
                  {role.cta} →
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-4 py-8 text-center">
          <ShieldCheckIcon className="size-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Prototype / demo platform. Certificates are demonstration records, not government-issued
            legal certificates.
          </p>
        </div>
      </footer>
    </div>
  );
}
