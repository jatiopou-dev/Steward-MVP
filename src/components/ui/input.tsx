import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Standard form control. Placeholder text meets the same 4.5:1 floor
 * as body copy, and an invalid field is marked by its own border plus
 * aria-invalid rather than by colour alone.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-[38px] w-full rounded-[var(--r-sm)] border border-[var(--line-strong)]",
          "bg-[var(--surface)] px-3 text-[var(--t-md)] text-[var(--ink)]",
          "transition-[border-color,box-shadow] duration-[160ms] ease-[var(--e-sharp)]",
          "placeholder:text-[var(--ink-3)]",
          "hover:border-[var(--n-400)]",
          "focus-visible:outline-none focus-visible:border-[var(--accent)]",
          "focus-visible:shadow-[0_0_0_3px_color-mix(in_oklch,var(--accent)_18%,transparent)]",
          "aria-[invalid=true]:border-[var(--neg)]",
          "aria-[invalid=true]:focus-visible:shadow-[0_0_0_3px_color-mix(in_oklch,var(--neg)_18%,transparent)]",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--bg-sunken)]",
          "file:border-0 file:bg-transparent file:text-[var(--t-md)] file:font-medium",
          // Money and counts read as figures, not prose.
          type === "number" &&
            "font-[family-name:var(--font-mono-tabular)] [font-variant-numeric:tabular-nums] text-right",
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
