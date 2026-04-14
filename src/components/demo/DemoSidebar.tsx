"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { type?: "header"; href?: string; icon?: string; label: string };

export default function DemoSidebar() {
  const pathname = usePathname();

  const navLinks: NavLink[] = [
    { href: "/demo", icon: "📊", label: "Overview" },
    { type: "header", label: "Treasury" },
    { href: "/demo/transactions", icon: "💳", label: "Transactions" },
    { href: "/demo/funds", icon: "📂", label: "Fund accounts" },
    { href: "/demo/budget", icon: "📈", label: "Budget" },
    { href: "/demo/payroll", icon: "💼", label: "Payroll" },
    { href: "/demo/giving", icon: "🎁", label: "Planned Giving" },
    { type: "header", label: "Church" },
    { href: "/demo/members", icon: "👥", label: "Membership" },
    { href: "/demo/ai", icon: "🧠", label: "AI assistant" },
    { href: "/demo/reports", icon: "📄", label: "Reports" },
    { type: "header", label: "Settings" },
    { href: "/demo/settings", icon: "⚙️", label: "Denomination setup" },
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
        <strong>Grace Baptist Church</strong>
        <small>Baptist · London Region</small>
        <div className="denom-tag">🕊️ Baptist</div>
      </div>

      {navLinks.map((link, idx) => {
        if (link.type === "header") return <div key={idx} className="nav-sec">{link.label}</div>;
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
