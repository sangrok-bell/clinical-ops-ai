import { CheckCheck, BellOff, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToastVariant } from "@/types";

type VariantStyle = {
  accent: string;
  iconBox: string;
  icon: LucideIcon;
};

const VARIANTS: Record<ToastVariant, VariantStyle> = {
  success: {
    accent: "border-l-positive",
    iconBox: "bg-[#f0f7e8] text-[#4d6a0f]",
    icon: CheckCheck,
  },
  info: {
    accent: "border-l-brand",
    iconBox: "bg-[#edf4fb] text-brand",
    icon: BellOff,
  },
  ghost: {
    accent: "border-l-[#dddde4]",
    iconBox: "bg-elevated text-dim",
    icon: CheckCheck,
  },
};

export function Toast({
  variant = "success",
  title,
  message,
  onClose,
  className,
}: {
  variant?: ToastVariant;
  title: string;
  message: string;
  onClose?: () => void;
  className?: string;
}) {
  const v = VARIANTS[variant];
  const Icon = v.icon;
  return (
    <div
      role="status"
      data-variant={variant}
      className={cn(
        "animate-toast-in flex items-center gap-3 rounded-toast border border-[#eeeef4] border-l-4 bg-surface p-3 pr-4 shadow-soft",
        v.accent,
        className,
      )}
    >
      <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", v.iconBox)}>
        <Icon className="size-5" strokeWidth={2.5} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold leading-tight text-ink">{title}</p>
        <p className="mt-0.5 truncate text-sm text-dim">{message}</p>
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onClose?.()}
        className="rounded-md p-1 text-dim transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-brand"
      >
        <X className="size-5" />
      </button>
    </div>
  );
}
