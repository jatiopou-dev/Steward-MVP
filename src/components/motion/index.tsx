"use client";

import * as React from "react";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "motion/react";
import { motionTokens, springs } from "@/lib/motion-tokens";
import { useSafeMotion } from "@/hooks/use-safe-motion";

/**
 * Shared motion primitives.
 *
 * Deliberately small. Product UI loads into a task — there is no
 * orchestrated page-load sequence here, and nothing animates unless it
 * is reporting state, preserving spatial continuity, or acknowledging
 * a press. Content is visible by default: every reveal enhances an
 * already-rendered element rather than gating it behind a transition,
 * so a headless render or a background tab still shows the data.
 */

/* ── Reveal ──────────────────────────────────────────────────────
   A single element settling into place. For panels that arrive after
   their data, not for decorating every section. */
export function Reveal({
  children,
  delay = 0,
  travel = motionTokens.distance.sm,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  travel?: number;
  className?: string;
}) {
  const m = useSafeMotion(travel);

  return (
    <motion.div
      className={className}
      initial={m.initial}
      animate={m.animate}
      transition={{ ...springs.gentle, delay: m.reduce ? 0 : delay }}
    >
      {children}
    </motion.div>
  );
}

/* ── Stagger ─────────────────────────────────────────────────────
   Staggering items inside ONE list is legitimate; applying an
   identical entrance to every section of a page is the reflex this
   avoids. The stagger is capped so a long ledger never makes the user
   wait for row 40. */
export function Stagger({
  children,
  className,
  step = 0.03,
  max = 8,
}: {
  children: React.ReactNode;
  className?: string;
  step?: number;
  max?: number;
}) {
  const m = useSafeMotion(motionTokens.distance.xs);
  const items = React.Children.toArray(children);

  return (
    <div className={className}>
      {items.map((child, i) => (
        <motion.div
          key={i}
          initial={m.initial}
          animate={m.animate}
          transition={{
            ...springs.snappy,
            delay: m.reduce ? 0 : Math.min(i, max) * step,
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

/* ── CountUp ─────────────────────────────────────────────────────
   A figure settling on its value. State reporting, not decoration:
   the correct number is in the accessible name from the first frame,
   and under reduced motion it simply appears. */
const countUpFormatters = {
  /* Pence in, pounds out. Sign is carried by the surrounding label, not
     the figure, so a deficit reads as a positive amount under a heading
     that says what it is. */
  gbp: (pence: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(pence) / 100),
  integer: (n: number) => Math.round(n).toLocaleString("en-GB"),
} as const;

export function CountUp({
  value,
  format = "integer",
  className,
}: {
  value: number;
  /* Named rather than a function: these figures are rendered from server
     components, and a function prop cannot cross that boundary. */
  format?: keyof typeof countUpFormatters;
  className?: string;
}) {
  const formatValue = countUpFormatters[format];
  const { mounted, reduce } = useSafeMotion();
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { ...springs.gentle, restDelta: 0.5 });
  const text = useTransform(spring, (n) => formatValue(n));

  React.useEffect(() => {
    mv.set(value);
  }, [mv, value]);

  if (!mounted || reduce) {
    return <span className={className}>{formatValue(value)}</span>;
  }

  return (
    <motion.span className={className} aria-label={formatValue(value)}>
      {text}
    </motion.span>
  );
}

/* ── Meter ───────────────────────────────────────────────────────
   Sizes by scaleX from a --fill custom property, never by animating
   width. Fills once it is actually on screen, so an off-screen fund
   list does not burn frames. */
export function Meter({
  fraction,
  className = "fund-fill",
  trackClassName = "fund-bar",
  color,
  label,
}: {
  fraction: number;
  className?: string;
  trackClassName?: string;
  color?: string;
  label?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const { mounted, reduce } = useSafeMotion();
  const clamped = Math.max(0, Math.min(1, fraction));
  const shown = !mounted || reduce || inView ? clamped : 0;

  return (
    <div
      ref={ref}
      className={trackClassName}
      role="meter"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={className}
        style={{ "--fill": shown, background: color } as React.CSSProperties}
      />
    </div>
  );
}

/* ── Pressable ───────────────────────────────────────────────────
   Feedback on pointer-down, not on release. The scale is small enough
   to read as a press rather than a bounce, and it is dropped entirely
   under reduced motion. */
export function Pressable({
  children,
  className,
  onClick,
  disabled,
  type = "button",
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  "aria-label"?: string;
}) {
  const { reduce } = useSafeMotion();

  return (
    <motion.button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      whileTap={reduce ? undefined : { scale: motionTokens.scale.press }}
      transition={springs.snappy}
    >
      {children}
    </motion.button>
  );
}
