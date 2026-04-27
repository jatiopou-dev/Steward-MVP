import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getFund, updateFund } from "@/app/actions/funds";
import FundForm from "../../FundForm";

export default async function EditFundPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fund = await getFund(id);
  if (!fund) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    await updateFund(id, formData);
  }

  return (
    <>
      <Topbar
        title="Edit fund"
        subtitle={fund.name}
        actions={
          <Link href="/dashboard/funds" className="btn btn-outline btn-sm">
            ← Back
          </Link>
        }
      />
      <div className="content">
        <div className="card" style={{ maxWidth: 580 }}>
          <FundForm
            defaultValues={fund}
            onSubmit={handleUpdate}
            submitLabel="Save changes"
          />
        </div>
      </div>
    </>
  );
}
