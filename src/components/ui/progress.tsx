"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

/**
 * Determinate progress. The indicator is positioned by translateX
 * rather than by animating width, so the browser composites it instead
 * of re-laying out the track on every frame.
 *
 * `tone` lets a budget bar turn negative when it crosses its ceiling —
 * the one case where this control carries a judgement, not just a value.
 */
const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    tone?: "accent" | "positive" | "warning" | "negative"
  }
>(({ className, value, tone = "accent", ...props }, ref) => {
  const fill = {
    accent: "var(--accent)",
    positive: "var(--pos)",
    warning: "var(--warn)",
    negative: "var(--neg)",
  }[tone]

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-[var(--r-pill)] bg-[var(--bg-sunken)]",
        className
      )}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 transition-transform duration-[320ms] ease-[var(--e-out)]"
        style={{
          background: fill,
          transform: `translateX(-${100 - (value ?? 0)}%)`,
        }}
      />
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
