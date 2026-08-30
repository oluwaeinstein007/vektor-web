import { type HTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils.js";

// A generic bordered/padded container for non-map-overlay surfaces (Target
// Workbench sections, field-pwa's status card). Deliberately distinct from
// apps/web's HudPanel, which stays fixed-anchor/collapsible/map-overlay
// specific — this is just a plain content block.
export const panelVariants = cva("rounded-md border p-4", {
  variants: {
    tone: {
      default: "bg-background text-foreground border-border",
      hud: "bg-[var(--hud-bg)] text-[var(--hud-fg)] border-[var(--hud-border)] font-mono",
    },
  },
  defaultVariants: { tone: "default" },
});

export interface PanelProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof panelVariants> {}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(({ className, tone, ...props }, ref) => (
  <div ref={ref} className={cn(panelVariants({ tone }), className)} {...props} />
));
Panel.displayName = "Panel";
