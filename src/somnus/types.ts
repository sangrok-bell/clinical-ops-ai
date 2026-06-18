import type { LucideIcon } from "lucide-react";

// Step state-machine types (distinct from the design-token enums in src/types.ts).
export type StepId = "protocol" | "rules" | "collect" | "monitor" | "review" | "lock";

/** Sequential gate flags (mirrors the mockup's riskCleared→step1Done→enginesLive→dataCollected). */
export type Gates = {
  step1Done: boolean; // ① protocol/ePRO·EDC design complete
  enginesLive: boolean; // ② validation rules approved → engines on
  dataCollected: boolean; // ③ patient data collected
};

export type StepStatus = "done" | "current" | "available" | "locked";

export type Step = { id: StepId; n: number; label: string; sub: string; desc: string; icon: LucideIcon };
