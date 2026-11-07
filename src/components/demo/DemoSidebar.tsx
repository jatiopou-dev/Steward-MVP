"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Briefcase,
  CreditCard,
  FileText,
  FolderOpen,
  HandCoins,
  LayoutDashboard,
  Settings,
  Sparkles,
  TrendingUp,
  Menu,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useDenomination } from "@/contexts/DenominationContext";
import { springs } from "@/lib/motion-tokens";
import { useSafeMotion } from "@/hooks/use-safe-motion";

type NavLink =
  | { type: "header"; label: string }
  | { type?: never; href: string; icon: LucideIcon; label: string };

/**
 * Demo navigation. Deliberately the same component vocabulary as the
 * authenticated sidebar — someone evaluating the product should be
 * looking at the real interface, not a brochure of it.
 */
export default function DemoSidebar() {
  const pathname = usePathname();
  const { terms } = useDenomination();
  const [open, setOpen] = React.useState(false);
  const { reduce } = useSafeMotion();

  // Close the drawer on navigation — never leave the user looking at
  // nav for a page they have already arrived at.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const navLinks: NavLink[] = [
    { href: "/demo", icon: LayoutDashboard, label: "Overview" },
    { type: "header", label: "Treasury" },
    { href: "/demo/transactions", icon: CreditCard, label: "Transactions" },
    { href: "/demo/funds", icon: FolderOpen, label: "Fund accounts" },
    { href: "/demo/budget", icon: TrendingUp, label: "Budget" },
    { href: "/demo/payroll", icon: Briefcase, label: "Payroll" },
    { href: "/demo/giving", icon: HandCoins, label: terms.giving },
    { type: "header", label: "Congregation" },
    { href: "/demo/members", icon: UsersRound, label: "Membership" },
    { href: "/demo/ai", icon: Sparkles, label: "AI assistant" },
    { href: "/demo/reports", icon: FileText, label: "Reports" },
    { type: "header", label: "Configuration" },
    { href: "/demo/settings", icon: Settings, label: "Denomination setup" },
  ];

  return (
    <>
      <button
        type="button"
        className="nav-trigger"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        aria-controls="demo-nav"
      >
        <Menu size={18} strokeWidth={1.8} />
      </button>

      <nav id="demo-nav" className="sidebar" data-open={open} aria-label="Primary">
      <div className="sidebar-head">
        <div className="logo">
          <div className="logo-icon">
            <div className="logo-cross" />
          </div>
          <div className="logo-name">
            Steward<span>.</span>
          </div>
        </div>
        <button
          type="button"
          className="nav-close"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        >
          <X size={18} strokeWidth={1.8} />
        </button>
      </div>

      <div className="sidebar-org">
        <strong>Grace {terms.label} Church</strong>
        <small>{terms.tier} · London Region</small>
        <div className="denom-tag">{terms.label}</div>
      </div>

      {navLinks.map((link, idx) => {
        if (link.type === "header") {
          return (
            <div key={`h-${idx}`} className="nav-sec">
              {link.label}
            </div>
          );
        }

        const isActive = pathname === link.href;
        const Icon = link.icon;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-item ${isActive ? "active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="ni" aria-hidden="true">
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
            </span>
            {link.label}
          </Link>
        );
      })}

      <div className="sidebar-foot">
        <Link href="/" className="nav-item">
          <span className="ni" aria-hidden="true">
            <ArrowLeft size={16} strokeWidth={1.8} />
          </span>
          Home
        </Link>
      </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            className="nav-scrim"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduce ? { duration: 0.15 } : springs.instant}
          />
        )}
      </AnimatePresence>
    </>
  );
}
