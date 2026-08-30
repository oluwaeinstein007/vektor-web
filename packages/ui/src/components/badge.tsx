import { type HTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils.js";

export const badgeVariants = cva("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground border-transparent",
      secondary: "bg-accent text-accent-foreground border-transparent",
      destructive: "bg-destructive text-destructive-foreground border-transparent",
      outline: "text-foreground border-border",
    },
    tone: {
      default: "",
      hud: "font-mono bg-[var(--hud-bg)] text-[var(--hud-fg)] border-[var(--hud-border)]",
    },
  },
  defaultVariants: { variant: "default", tone: "default" },
});

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(({ className, variant, tone, ...props }, ref) => (
  <span ref={ref} className={cn(badgeVariants({ variant, tone }), className)} {...props} />
));
Badge.displayName = "Badge";
