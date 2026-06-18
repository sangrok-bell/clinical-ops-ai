import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-40 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        brand: "bg-positive text-onaccent hover:brightness-[0.97] active:scale-[0.98]",
        point: "bg-point text-onaccent hover:brightness-95 active:scale-[0.98]",
        navy: "bg-brand text-white hover:brightness-110 active:scale-[0.98]",
        surface: "bg-elevated text-ink hover:brightness-[0.97] active:scale-[0.98]",
        ghost: "text-dim hover:bg-elevated hover:text-ink active:scale-[0.98]",
        outline: "border border-[#dddde4] text-ink hover:bg-elevated",
      },
      size: {
        md: "h-11 rounded-btn px-4 text-sm",
        sm: "h-9 rounded-btn px-3 text-sm",
        icon: "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "brand",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
