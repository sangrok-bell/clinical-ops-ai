import * as React from "react";
import { cn } from "@/lib/utils";
import type { PillTone } from "@/types";

const toneBg: Record<PillTone, string> = {
  positive: "bg-positive",
  magenta: "bg-magenta",
  danger: "bg-danger",
};

export function CountPill({
  tone = "positive",
  urgent = false,
  className,
  children,
}: {
  tone?: PillTone;
  urgent?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-pill px-1.5 text-xs font-semibold text-onaccent",
        toneBg[tone],
        urgent && "ring-2 ring-white/30",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ className }: { className?: string }) {
  return <span className={cn("inline-block size-2 rounded-full bg-magenta", className)} />;
}
