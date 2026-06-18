import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountPill, Dot } from "@/components/ui/badge";
import type { PillTone } from "@/types";

export function NavItem({
  icon: Icon,
  label,
  count,
  tone = "positive",
  active,
  className,
  ...props
}: {
  icon: LucideIcon;
  label: string;
  count?: number;
  tone?: PillTone;
  active?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[15px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand",
        active
          ? "bg-brand-gradient text-ink font-semibold"
          : "text-dim hover:bg-elevated hover:text-ink",
        className,
      )}
      {...props}
    >
      <Icon className={cn("size-5", active ? "text-ink" : "text-icon")} />
      <span className="flex-1 font-medium">{label}</span>
      {count !== undefined && (
        <CountPill tone={tone} urgent={tone === "danger"}>
          {count}
        </CountPill>
      )}
    </button>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-dim/80">
      {children}
    </p>
  );
}

export function Tab({
  active,
  dot,
  children,
  className,
  ...props
}: {
  active?: boolean;
  dot?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "relative -mb-px pb-3 text-[15px] font-semibold transition-colors outline-none focus-visible:text-ink",
        active ? "text-ink font-semibold" : "text-dim hover:text-ink",
        className,
      )}
      {...props}
    >
      {children}
      {dot && <Dot className="absolute -right-2.5 top-0.5" />}
      {active && (
        <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-positive" />
      )}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  glassy,
  children,
  className,
  ...props
}: {
  icon: LucideIcon;
  glassy?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "relative flex items-center justify-center rounded-full text-icon transition-colors hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand",
        glassy ? "glass size-12 shadow-soft" : "size-10",
        className,
      )}
      {...props}
    >
      <Icon className="size-5" />
      {children}
    </button>
  );
}
