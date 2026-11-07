"use server"

import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const denominationTerms = {
  anglican: {
    giving_term: "Planned giving (FWO)",
    body_term: "PCC",
    minister_term: "Vicar",
    tier_term: "Diocese",
  },
  baptist: {
    giving_term: "Covenanted giving",
    body_term: "Deacons",
    minister_term: "Minister",
    tier_term: "Association",
  },
  methodist: {
    giving_term: "Planned giving",
    body_term: "Church Council",
    minister_term: "Minister",
    tier_term: "Circuit",
  },
  pentecostal: {
    giving_term: "Tithe & offerings",
    body_term: "Elders",
    minister_term: "Pastor",
    tier_term: "Network",
  },
  catholic: {
    giving_term: "Parish giving",
    body_term: "Finance Committee",
    minister_term: "Parish Priest",
    tier_term: "Diocese",
  },
  presbyterian: {
    giving_term: "Freewill offering (FWO)",
    body_term: "Session",
    minister_term: "Minister",
    tier_term: "Presbytery",
  },
  adventist: {
    giving_term: "Systematic Benevolence",
    body_term: "Church Board",
    minister_term: "Pastor",
    tier_term: "Conference",
  },
  independent: {
    giving_term: "Regular giving",
    body_term: "Leadership team",
    minister_term: "Pastor",
    tier_term: "Network",
  },
} as const;

const defaultFunds = [
  {
    name: "General Fund",
    type: "unrestricted",
    description: "Core unrestricted income and day-to-day ministry expenditure.",
  },
  {
    name: "Building Fund",
    type: "designated",
    description: "Money set aside by the church for property, repairs, and facilities.",
  },
  {
    name: "Mission Fund",
    type: "restricted",
    description: "Restricted gifts and grants given for mission or outreach work.",
  },
] as const;

type SupportedDenomination = keyof typeof denominationTerms;

function normaliseDenomination(value: FormDataEntryValue | null): SupportedDenomination {
  if (typeof value !== "string") return "independent";
  return value in denominationTerms ? (value as SupportedDenomination) : "independent";
}

export async function getOrganizationDetails() {
  const supabase = await createClient();
  
  // Relies on RLS to return the user's organization based on their profile
  const { data, error } = await supabase
    .from('organizations')
    .select('*, denomination_config(*)')
    .limit(1)
    .single();

  if (error) {
    console.error("Error fetching organization:", error);
    return null;
  }
  return data;
}

export async function saveDenomination(formData: FormData) {
  const denomination = normaliseDenomination(formData.get("denomination"));
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .single();

  if (!profile?.org_id) throw new Error("No organisation found");

  const { error } = await supabase
    .from("organizations")
    .update({ denomination })
    .eq("id", profile.org_id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/giving");
}

export async function createOrganization(formData: FormData) {
  const name = ((formData.get('name') as string) ?? "").trim();
  const denomination = normaliseDenomination(formData.get('denomination'));

  if (!name || !denomination) throw new Error("Missing required fields");

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/auth');
  }

  // Bootstrap writes go through the service role. Every row below is readable
  // only once profiles.org_id points at the new organisation, so the user's own
  // client cannot read back a row it has just inserted — Postgres applies the
  // SELECT policy to the RETURNING clause and rejects the insert outright.
  // The signed-in user above is what authorises this; each row is pinned to them.
  const admin = createAdminClient();

  // The app carries two tenancy models: `organizations` + profiles.org_id
  // (overview, funds, transactions, members, reports) and `organisations` +
  // `memberships` (donors, Gift Aid, appeals, reconciliation, imports).
  // Creating only the first left half the navigation bouncing back here
  // forever. Both rows are written under ONE id, so reconciliation_periods —
  // keyed by organisation_id — is the same org the overview reads its seal
  // from, rather than a second church that merely shares a name.
  const orgId = crypto.randomUUID();

  // 1. Create the org, in both shapes.
  const { error: orgError } = await admin
    .from('organizations')
    .insert({ id: orgId, name, denomination, tier: 'church' });

  if (orgError) throw new Error(orgError.message || "Failed to create organization");

  const { error: orgV2Error } = await admin
    .from('organisations')
    .insert({ id: orgId, name, type: 'church' });

  if (orgV2Error) throw new Error(orgV2Error.message);

  // Whoever creates the church owns it. 'treasurer' is the profiles
  // vocabulary; memberships keeps its own and accepts only these roles.
  const { error: membershipError } = await admin
    .from('memberships')
    .insert({
      user_id: user.id,
      organisation_id: orgId,
      role: 'owner',
      status: 'active',
    });

  if (membershipError) throw new Error(membershipError.message);

  // 2. Point the user's profile at the new org. Deliberately last of the
  // ownership writes: this link is what lets them past onboarding, so a
  // failure above leaves them here able to try again rather than inside a
  // half-built workspace.
  const { error: profileError } = await admin
    .from('profiles')
    .update({ org_id: orgId })
    .eq('id', user.id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  // 3. Create denomination config and starter funds for a useful first dashboard.
  const { error: configError } = await admin
    .from('denomination_config')
    .insert({
      org_id: orgId,
      ...denominationTerms[denomination],
    });

  if (configError) {
    throw new Error(configError.message);
  }

  const { error: fundsError } = await admin
    .from('funds')
    .insert(defaultFunds.map((fund) => ({
      org_id: orgId,
      name: fund.name,
      type: fund.type,
      balance_pence: 0,
      description: fund.description,
      status: "active",
    })));

  if (fundsError) {
    throw new Error(fundsError.message);
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/funds');
  redirect('/dashboard');
}
