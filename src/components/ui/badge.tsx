import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Status, never decoration. Each variant maps to one meaning in the
 * finance vocabulary, so the same colour always says the same thing:
 * positive is money in or a cleared state, warning is awaiting action,
 * destructive is a failure or a shortfall.
 */
const badgeVariants = cva(
  [
    "inline-flex items-center gap-1 rounded-[var(--r-pill)] border",
    "px-2 py-[2px] text-[var(--t-xs)] font-[550]",
    "tracking-[var(--tr-base)] whitespace-nowrap",
    "transition-colors duration-[160ms] ease-[var(--e-sharp)]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--accent)] text-[var(--ink-on-accent)]",
        secondary:
          "border-[var(--line)] bg-[var(--bg-sunken)] text-[var(--ink-3)]",
        positive:
          "border-[color-mix(in_oklch,var(--pos)_22%,transparent)] bg-[var(--pos-soft)] text-[var(--pos)]",
        warning:
          "border-[color-mix(in_oklch,var(--warn)_24%,transparent)] bg-[var(--warn-soft)] text-[var(--warn)]",
        destructive:
          "border-[color-mix(in_oklch,var(--neg)_22%,transparent)] bg-[var(--neg-soft)] text-[var(--neg)]",
        seal:
          "border-[color-mix(in_oklch,var(--seal)_26%,transparent)] bg-[var(--seal-soft)] text-[var(--seal)]",
        outline: "border-[var(--line-strong)] text-[var(--ink-2)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
