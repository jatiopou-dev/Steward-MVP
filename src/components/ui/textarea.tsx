import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[92px] w-full resize-y rounded-[var(--r-sm)]",
        "border border-[var(--line-strong)] bg-[var(--surface)]",
        "p-3 text-[var(--t-md)] leading-[var(--lh-md)] text-[var(--ink)]",
        "transition-[border-color,box-shadow] duration-[160ms] ease-[var(--e-sharp)]",
        "placeholder:text-[var(--ink-3)]",
        "hover:border-[var(--n-400)]",
        "focus-visible:outline-none focus-visible:border-[var(--accent)]",
        "focus-visible:shadow-[0_0_0_3px_color-mix(in_oklch,var(--accent)_18%,transparent)]",
        "aria-[invalid=true]:border-[var(--neg)]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--bg-sunken)]",
        className
      )}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
