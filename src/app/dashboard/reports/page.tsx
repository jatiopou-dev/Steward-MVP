import React from "react";
import Topbar from "@/components/dashboard/Topbar";
import { createClient } from "@/utils/supabase/server";
import ReportsClient from "./ReportsClient";
import { getGiftAidExport } from "@/app/actions/giving";

export type MonthSummary = {
  period_label: string;
  income_pence: number;
  expense_pence: number;
  tx_count: number;
};

export type MemberGivingRow = {
  member_id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  is_gift_aid_eligible: boolean;
  total_pence: number;
  ytd_pence: number;
  gift_count: number;
  last_gift_date: string | null;
};

export type FundRow = {
  id: string;
  name: string;
  type: string;
  balance_pence: number;
  description: string | null;
};

export default async function ReportsPage() {
  const supabase = await createClient();

  const { data: profile } = await supabase.from("profiles").select("org_id").single();
  const orgId = profile?.org_id as string | undefined;

  const [
    { data: orgData },
    { data: rawMonthly },
    { data: rawGivers },
    { data: rawFunds },
    giftAid,
  ] = await Promise.all([
    supabase.from("organizations").select("name, denomination").single(),
    orgId
      ? supabase.rpc("get_income_expense_summary", { p_org_id: orgId })
      : Promise.resolve({ data: [] }),
    orgId
      ? supabase.rpc("get_member_giving_summary", { p_org_id: orgId })
      : Promise.resolve({ data: [] }),
    supabase
      .from("funds")
      .select("id, name, type, balance_pence, description")
      .order("balance_pence", { ascending: false }),
    getGiftAidExport(),
  ]);

  const monthly = (rawMonthly ?? []) as MonthSummary[];
  const givers = (rawGivers ?? []) as MemberGivingRow[];
  const funds = (rawFunds ?? []) as FundRow[];
  const orgName = (orgData as { name?: string } | null)?.name ?? "Your Church";

  return (
    <>
      <Topbar
        title="Reports"
        subtitle={`${orgName} · Financial reports & exports`}
      />
      <ReportsClient
        orgName={orgName}
        monthly={monthly}
        givers={givers}
        funds={funds}
        giftAidCsv={giftAid.csv}
        claimablePence={giftAid.claimablePence}
        claimableCount={giftAid.claimableCount}
      />
    </>
  );
}
