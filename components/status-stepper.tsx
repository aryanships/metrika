import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepperStep = { label: string; done?: boolean; current?: boolean };

/**
 * Horizontal lifecycle indicator. Presentational only.
 */
export function StatusStepper({ steps, className }: { steps: StepperStep[]; className?: string }) {
  return (
    <ol className={cn("flex flex-wrap items-center gap-1", className)}>
      {steps.map((step, i) => (
        <li key={step.label} className="flex items-center gap-1">
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              step.done
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : step.current
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {step.done ? <CheckIcon className="size-3" /> : null}
            {step.label}
          </span>
          {i < steps.length - 1 ? <span className="text-muted-foreground/40">→</span> : null}
        </li>
      ))}
    </ol>
  );
}
