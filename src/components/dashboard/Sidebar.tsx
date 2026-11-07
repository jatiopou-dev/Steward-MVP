"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Briefcase,
  CreditCard,
  Download,
  FileText,
  FolderOpen,
  Gift,
  HandCoins,
  LayoutDashboard,
  Megaphone,
  Menu,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
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
 * Primary navigation.
 *
 * Items are named for their contents rather than for a vague umbrella,
 * so the destination is predictable before the click. The active item
 * is marked with the accent — one of the few places selection colour
 * is used — and icons are real glyphs rather than emoji, which render
 * differently on every platform and carry no weight hierarchy.
 */
export default function Sidebar({ orgName }: { orgName: string }) {
  const pathname = usePathname();
  const { terms } = useDenomination();
  const [open, setOpen] = React.useState(false);
  const { reduce } = useSafeMotion();

  // Close the drawer when the route changes — never leave the user
  // looking at nav for a page they have already arrived at.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const navLinks: NavLink[] = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
    { type: "header", label: "Giving" },
    { href: "/dashboard/donations/import", icon: Download, label: "Donation imports" },
    { href: "/dashboard/reconciliation", icon: ShieldCheck, label: "Reconciliation" },
    { href: "/dashboard/gift-aid", icon: Gift, label: "Gift Aid" },
    { href: "/dashboard/donors", icon: User, label: "Donors" },
    { href: "/dashboard/appeals", icon: Megaphone, label: "Appeals" },
    { type: "header", label: "Treasury" },
    { href: "/dashboard/transactions", icon: CreditCard, label: "Transactions" },
    { href: "/dashboard/funds", icon: FolderOpen, label: "Fund accounts" },
    { href: "/dashboard/budget", icon: TrendingUp, label: "Budget" },
    { href: "/dashboard/payroll", icon: Briefcase, label: "Payroll" },
    { href: "/dashboard/giving", icon: HandCoins, label: terms.giving },
    { type: "header", label: "Congregation" },
    { href: "/dashboard/members", icon: UsersRound, label: "Membership" },
    { href: "/dashboard/ai", icon: Sparkles, label: "AI assistant" },
    { href: "/dashboard/reports", icon: FileText, label: "Reports" },
    { type: "header", label: "Configuration" },
    { href: "/dashboard/settings", icon: Settings, label: "Denomination setup" },
  ];

  return (
    <>
      {/* Drawer trigger. Only shown where the sidebar is off-canvas. */}
      <button
        type="button"
        className="nav-trigger"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        aria-controls="primary-nav"
      >
        <Menu size={18} strokeWidth={1.8} />
      </button>

      <nav id="primary-nav" className="sidebar" data-open={open} aria-label="Primary">
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
          <strong>{orgName}</strong>
          {/* The tier is the denomination's own structure. No region: the
              app does not know one, and inventing it undermines every
              other figure on the page. */}
          <small>{terms.tier}</small>
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

      {/* A modal drawer dims its background. The scrim fades along the
          same path in both directions, so dismissing mirrors opening. */}
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
