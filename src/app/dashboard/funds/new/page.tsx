import React from "react";
import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { createFund } from "@/app/actions/funds";
import FundForm from "../FundForm";

export default function NewFundPage() {
  return (
    <>
      <Topbar
        title="New fund account"
        subtitle="Create a restricted, unrestricted or designated fund"
        actions={
          <Link href="/dashboard/funds" className="btn btn-outline btn-sm">
            ← Back
          </Link>
        }
      />
      <div className="content">
        <div className="card" style={{ maxWidth: 580 }}>
          <FundForm onSubmit={createFund} submitLabel="Create fund" />
        </div>
      </div>
    </>
  );
}
