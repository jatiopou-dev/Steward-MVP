import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Data table. Density is correct here — a treasurer scanning 200 rows
 * wants more rows, not more padding — so alignment does the work that
 * decoration would otherwise do.
 *
 * Add `numeric` to a head or cell and it right-aligns and switches to
 * tabular figures, so decimal points line up down the column and a
 * wrong order of magnitude is visible at a glance.
 */
const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn(
        "w-full caption-bottom border-collapse text-[var(--t-md)]",
        className
      )}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-[var(--line-strong)] bg-[var(--bg-sunken)] font-semibold",
      "[&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-[var(--line)] transition-colors duration-[160ms] ease-[var(--e-sharp)]",
      "hover:bg-[var(--bg-sunken)] data-[state=selected]:bg-[var(--accent-soft)]",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }
>(({ className, numeric, ...props }, ref) => (
  <th
    ref={ref}
    scope="col"
    className={cn(
      "sticky top-0 z-[var(--z-raised)] bg-[var(--surface)]",
      "h-9 px-3 align-middle text-left",
      "text-[var(--t-xs)] font-semibold tracking-[var(--tr-wide)] text-[var(--ink-3)]",
      "[&:has([role=checkbox])]:pr-0",
      numeric && "text-right",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }
>(({ className, numeric, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-3 py-3 align-middle text-[var(--ink-2)]",
      "[&:has([role=checkbox])]:pr-0",
      numeric &&
        "text-right font-[family-name:var(--font-mono-tabular)] [font-variant-numeric:tabular-nums] text-[var(--ink)]",
      className
    )}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-3 text-[var(--t-sm)] text-[var(--ink-3)]", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
