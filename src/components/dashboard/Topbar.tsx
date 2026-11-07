import React from "react";

export type SealState = "verified" | "pending" | "none";

/**
 * Page chrome.
 *
 * A translucent layer the content scrolls beneath rather than an opaque
 * strip that eats a fixed band of the viewport. It answers the three
 * wayfinding questions a treasurer has on arrival: where am I, what
 * period am I looking at, and is that period trustworthy.
 *
 * The seal is the last of those — the reconciliation state of the
 * period on screen, carried in the chrome so the answer is never more
 * than a glance away. It is the one piece of status that belongs here;
 * everything else is an action.
 */
export default function Topbar({
  title,
  subtitle,
  actions,
  seal,
}: {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  actions?: React.ReactNode;
  seal?: {
    state: SealState;
    /** Share of the period's value that is reconciled, 0–1. */
    fraction?: number;
    label?: string;
  };
}) {
  return (
    <header className="topbar">
      <div className="topbar-lead">
        <h1 className="topbar-title">{title}</h1>
        <div className="topbar-sub">{subtitle}</div>
      </div>

      <div className="topbar-actions">
        {seal && seal.state !== "none" && (
          <span
            className="seal"
            data-state={seal.state}
            title={
              seal.state === "verified"
                ? "Every transaction in this period is matched to the bank feed."
                : "Some transactions in this period are not yet matched to the bank feed."
            }
          >
            <span className="seal-dot" aria-hidden="true" />
            {seal.label ?? (seal.state === "verified" ? "Reconciled" : "Unreconciled")}
            {typeof seal.fraction === "number" && (
              <span
                className="seal-meter"
                role="meter"
                aria-valuenow={Math.round(seal.fraction * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Share of this period reconciled"
              >
                <i
                  style={
                    {
                      "--fill": Math.max(0, Math.min(1, seal.fraction)),
                    } as React.CSSProperties
                  }
                />
              </span>
            )}
          </span>
        )}
        {actions}
      </div>
    </header>
  );
}
