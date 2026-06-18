import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Step, StepId, StepStatus } from "./types";

const dotCls: Record<StepStatus, string> = {
  done: "bg-positive text-onaccent",
  current: "bg-brand text-white",
  available: "bg-elevated text-dim",
  locked: "bg-elevated text-icon",
};

export function Stepper({
  steps,
  currentId,
  statusOf,
  onSelect,
}: {
  steps: Step[];
  currentId: StepId;
  statusOf: (id: StepId) => StepStatus;
  onSelect: (id: StepId) => void;
}) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto pb-1">
      {steps.map((s, i) => {
        const st: StepStatus = s.id === currentId ? "current" : statusOf(s.id);
        const current = st === "current";
        return (
          <li key={s.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              aria-current={current ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-pill px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-brand",
                current ? "font-semibold text-ink" : "text-dim hover:text-ink",
              )}
            >
              <span className={cn("flex size-6 items-center justify-center rounded-full text-xs font-bold", dotCls[st])}>
                {st === "done" ? <Check className="size-3.5" /> : s.n}
              </span>
              <span className="whitespace-nowrap">{s.label}</span>
            </button>
            {i < steps.length - 1 ? <span className="h-px w-5 shrink-0 bg-[#eeeef4]" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
