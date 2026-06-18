"use client";
import React, { useState } from "react";
import Topbar from "@/components/dashboard/Topbar";
import { useDemoState } from "@/contexts/DemoStateContext";

type StaffStatus = "Pending" | "Processing..." | "Paid";
type Staff = { id: number; name: string; role: string; gross: number; ni: number; net: number; status: StaffStatus };

const INITIAL: Staff[] = [
  { id: 1, name: "Rev. Michael Ade", role: "Senior Pastor", gross: 3800, ni: 390, net: 3190, status: "Pending" },
  { id: 2, name: "Grace Mensah", role: "Church Administrator", gross: 1600, ni: 130, net: 1395, status: "Pending" },
];

export default function DemoPayroll() {
  const { dispatch } = useDemoState();
  const [staff, setStaff] = useState<Staff[]>(INITIAL);
  const [running, setRunning] = useState(false);
  const [ran, setRan] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const runPayroll = () => {
    setShowConfirm(false);
    setRunning(true);
    setStaff(prev => prev.map(s => ({ ...s, status: "Processing..." })));
    setTimeout(() => {
      setStaff(prev => prev.map(s => ({ ...s, status: "Paid" })));
      setRunning(false);
      setRan(true);
      dispatch({ type: "SET_PAYROLL_RAN" });
    }, 2000);
  };

  const totalGross = staff.reduce((s, e) => s + e.gross, 0);
  const employerNI = Math.round(totalGross * 0.138);
  const paye = 203;

  return (
    <>
      <Topbar
        title="Payroll"
        subtitle={`Staff payroll · April 2026${ran ? " · ✅ Processed" : ""}`}
        actions={
          <button className="btn btn-forest btn-sm" onClick={() => setShowConfirm(true)} disabled={running || ran}>
            {running ? "Processing..." : ran ? "✅ Payroll sent" : "▶ Run Payroll"}
          </button>
        }
      />
      <div className="content">
        <div className="kpi-row">
          <div className="kpi"><div className="kpi-lbl">Total gross pay</div><div className="kpi-val">£{totalGross.toLocaleString()}</div><div className="kpi-meta neutral">{staff.length} employees</div></div>
          <div className="kpi"><div className="kpi-lbl">Employer NI</div><div className="kpi-val">£{employerNI.toLocaleString()}</div><div className="kpi-meta neutral">Due 19 May</div></div>
          <div className="kpi"><div className="kpi-lbl">PAYE to HMRC</div><div className="kpi-val">£{paye}</div><div className="kpi-meta neutral">Due 19 May</div></div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">April payroll run</div>{ran && <div className="card-link">Download payslips →</div>}</div>
          <table className="tbl">
            <thead><tr><th>Name</th><th>Role</th><th>Gross</th><th>NI (EE)</th><th>Net pay</th><th>Status</th></tr></thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td>{s.role}</td>
                  <td>£{s.gross.toLocaleString()}</td>
                  <td>£{s.ni}</td>
                  <td><strong>£{s.net.toLocaleString()}</strong></td>
                  <td>
                    <div className={`chip ${s.status === "Paid" ? "chip-sage" : s.status === "Processing..." ? "chip-gold" : "chip-stone"}`}>
                      {s.status === "Processing..." ? "⏳ Processing..." : s.status}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {ran && (
          <div className="ai-card" style={{ marginTop: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div className="ai-badge">✅ Confirmed</div>
              <div className="serif" style={{ color: "var(--cream)", fontWeight: 600 }}>Payroll run complete</div>
            </div>
            <div className="ai-insight">
              ✅ £{(staff.reduce((s, e) => s + e.net, 0)).toLocaleString()} sent to {staff.length} employees. HMRC payment of £{paye + employerNI} due by <strong>19 May 2026</strong>. Payslips are ready to download.
            </div>
          </div>
        )}
      </div>

      {showConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: 380, padding: "2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="card-title">Confirm Payroll Run</div>
            <p style={{ color: "var(--fg-muted)", fontSize: "0.93rem" }}>
              You are about to process <strong>April 2026</strong> payroll for {staff.length} employees, totalling <strong>£{totalGross.toLocaleString()}</strong> gross. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn btn-forest" style={{ flex: 1 }} onClick={runPayroll}>Yes, run payroll</button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
