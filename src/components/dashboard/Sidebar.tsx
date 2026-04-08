"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDenomination } from "@/contexts/DenominationContext";

type NavLink = {
  type?: "header";
  href?: string;
  icon?: string;
  label: string;
};

export default function Sidebar() {
  const pathname = usePathname();
  const { terms } = useDenomination();

  const navLinks: NavLink[] = [
    { href: "/dashboard", icon: "📊", label: "Overview" },
    { type: "header", label: "Treasury" },
    { href: "/dashboard/transactions", icon: "💳", label: "Transactions" },
    { href: "/dashboard/funds", icon: "📂", label: "Fund accounts" },
    { href: "/dashboard/budget", icon: "📈", label: "Budget" },
    { href: "/dashboard/payroll", icon: "💼", label: "Payroll" },
    { href: "/dashboard/giving", icon: "🎁", label: terms.giving },
    { type: "header", label: "Church" },
    { href: "/dashboard/members", icon: "👥", label: "Membership" },
    { href: "/dashboard/ai", icon: "🧠", label: "AI assistant" },
    { href: "/dashboard/reports", icon: "📄", label: "Reports" },
    { type: "header", label: "Settings" },
    { href: "/dashboard/settings", icon: "⚙️", label: "Denomination setup" },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-head">
        <div className="logo">
          <div className="logo-icon" style={{ width: 28, height: 28 }}>
            <div className="logo-cross" style={{ width: 11, height: 11 }}></div>
          </div>
          <div className="logo-name" style={{ fontSize: "1.2rem" }}>
            Steward<span>.</span>
          </div>
        </div>
      </div>
      <div className="sidebar-org">
        <strong>Grace {terms.label} Church</strong>
        <small>{terms.label} · London Region</small>
        <div className="denom-tag">
          {terms.icon} {terms.label}
        </div>
      </div>

      {navLinks.map((link, idx) => {
        if (link.type === "header") {
          return (
            <div key={idx} className="nav-sec">
              {link.label}
            </div>
          );
        }
        const isActive = pathname === link.href;
        return (
          <Link key={idx} href={link.href!} className={`nav-item ${isActive ? "active" : ""}`}>
            <span className="ni">{link.icon}</span>
            {link.label}
          </Link>
        );
      })}

      <div className="sidebar-foot">
        <Link href="/" className="nav-item">
          <span className="ni">←</span>Home
        </Link>
      </div>
    </div>
  );
}
