"use client";
import React from "react";

export default function Topbar({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        <div className="topbar-sub">{subtitle}</div>
      </div>
      <div className="topbar-actions">{actions}</div>
    </div>
  );
}
