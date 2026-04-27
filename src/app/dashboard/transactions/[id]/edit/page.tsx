import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { createClient } from "@/utils/supabase/server";
import { updateTransaction, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "@/app/actions/transactions";
import EditTransactionForm from "./EditTransactionForm";

async function getTransaction(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data;
}

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tx = await getTransaction(id);
  if (!tx) notFound();

  return (
    <>
      <Topbar
        title="Edit transaction"
        subtitle="Update the details below"
        actions={
          <Link href="/dashboard/transactions" className="btn btn-outline btn-sm">
            ← Back
          </Link>
        }
      />
      <div className="content">
        <div className="card" style={{ maxWidth: 560 }}>
          <EditTransactionForm tx={tx} />
        </div>
      </div>
    </>
  );
}
