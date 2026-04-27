import React from "react";
import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { createMember } from "@/app/actions/members";
import MemberForm from "../MemberForm";

export default function NewMemberPage() {
  return (
    <>
      <Topbar
        title="Add member"
        subtitle="Add a new person to the congregation directory"
        actions={
          <Link href="/dashboard/members" className="btn btn-outline btn-sm">
            ← Back
          </Link>
        }
      />
      <div className="content">
        <div className="card" style={{ maxWidth: 680 }}>
          <MemberForm onSubmit={createMember} submitLabel="Add member" />
        </div>
      </div>
    </>
  );
}
