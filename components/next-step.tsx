import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A single, prominent "what do I do next" action card. Presentational only:
 * the caller decides the title/href from the data it already fetched.
 */
export function NextStepCard({
  title,
  description,
  href,
  ctaLabel,
  icon,
  secondary,
  className,
}: {
  title: string;
  description?: string;
  href: string;
  ctaLabel: string;
  icon?: ReactNode;
  secondary?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {icon ? <div className="mt-0.5 text-primary">{icon}</div> : null}
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold">{title}</p>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {secondary ? (
          <Link
            href={secondary.href}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            {secondary.label}
          </Link>
        ) : null}
        <Link
          href={href}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/80"
        >
          {ctaLabel}
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
