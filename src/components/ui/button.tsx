import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * One button vocabulary for the whole product. If the save button looks
 * different on two screens, one of them is wrong.
 *
 * Every variant carries the full state set — default, hover, focus,
 * active, disabled, loading — and the press is acknowledged on
 * pointer-down via :active rather than waiting for the click to land.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-[var(--r-sm)] font-medium",
    "transition-[background-color,border-color,color,box-shadow,transform]",
    "duration-[160ms] ease-[var(--e-sharp)]",
    "active:scale-[0.975] active:duration-[80ms]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-ring)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-[15px] [&_svg]:shrink-0",
    "motion-reduce:active:scale-100",
  ].join(" "),
  {
    variants: {
      variant: {
        /** The one primary action on a screen. */
        default:
          "bg-[var(--accent)] text-[var(--ink-on-accent)] shadow-[var(--sh-1)] hover:bg-[var(--accent-hover)]",
        destructive:
          "bg-[var(--neg)] text-white shadow-[var(--sh-1)] hover:brightness-95",
        outline:
          "border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--bg-sunken)] hover:border-[var(--n-400)]",
        secondary:
          "bg-[var(--bg-sunken)] text-[var(--ink-2)] border border-[var(--line)] hover:bg-[var(--n-100)]",
        ghost:
          "text-[var(--ink-2)] hover:bg-[color-mix(in_oklch,var(--ink)_6%,transparent)] hover:text-[var(--ink)]",
        link:
          "text-[var(--accent)] underline-offset-4 hover:underline hover:text-[var(--accent-hover)]",
      },
      size: {
        default: "h-9 px-4 text-[var(--t-md)]",
        sm: "h-[30px] px-3 text-[var(--t-sm)]",
        lg: "h-10 px-6 text-[var(--t-base)]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /**
   * Shows a spinner and blocks input without collapsing the button's
   * width, so the layout around it does not jump mid-submit.
   */
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, children, disabled, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"

    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      )
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
