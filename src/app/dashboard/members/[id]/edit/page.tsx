import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import { getMember, updateMember } from "@/app/actions/members";
import MemberForm from "../../MemberForm";

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await getMember(id);
  if (!member) notFound();

  const fullName = [member.title, member.first_name, member.last_name]
    .filter(Boolean)
    .join(" ");

  async function handleUpdate(formData: FormData) {
    "use server";
    await updateMember(id, formData);
  }

  return (
    <>
      <Topbar
        title="Edit member"
        subtitle={fullName}
        actions={
          <Link href="/dashboard/members" className="btn btn-outline btn-sm">
            ← Back
          </Link>
        }
      />
      <div className="content">
        <div className="card" style={{ maxWidth: 680 }}>
          <MemberForm
            defaultValues={member}
            onSubmit={handleUpdate}
            submitLabel="Save changes"
          />
        </div>
      </div>
    </>
  );
}
