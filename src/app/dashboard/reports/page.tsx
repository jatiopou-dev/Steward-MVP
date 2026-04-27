import React from "react";
import Topbar from "@/components/dashboard/Topbar";
import { getGiftAidExport } from "@/app/actions/giving";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage() {
  const giftAid = await getGiftAidExport();

  return (
    <>
      <Topbar 
        title="Reports"
        subtitle="AI-generated · Board ready · One click"
      />
      <ReportsClient
        giftAidCsv={giftAid.csv}
        claimablePence={giftAid.claimablePence}
        claimableCount={giftAid.claimableCount}
      />
    </>
  );
}
