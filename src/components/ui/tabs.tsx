"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

/**
 * Segmented control. The selected tab is a raised solid surface inside
 * a sunken track, so selection is carried by material and position
 * rather than by colour alone — which keeps it legible in high
 * contrast and for colour-blind users.
 */
const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center gap-1 rounded-[var(--r-md)]",
      "border border-[var(--line)] bg-[var(--bg-sunken)] p-1",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-1.5 whitespace-nowrap",
      "rounded-[var(--r-xs)] px-3 py-1",
      "text-[var(--t-md)] font-medium text-[var(--ink-3)]",
      "transition-[background-color,color,box-shadow] duration-[160ms] ease-[var(--e-sharp)]",
      "hover:text-[var(--ink)]",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-ring)]",
      "disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:bg-[var(--surface)] data-[state=active]:text-[var(--ink)]",
      "data-[state=active]:shadow-[var(--sh-1)] data-[state=active]:font-semibold",
      "[&_svg]:size-[15px] [&_svg]:shrink-0",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 focus-visible:outline-2 focus-visible:outline-offset-2",
      "focus-visible:outline-[var(--accent-ring)]",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
