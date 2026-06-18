"use server"

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

export async function createOrganization(formData: FormData) {
  const name = ((formData.get('name') as string) ?? "").trim();
  const denomination = normaliseDenomination(formData.get('denomination'));

  if (!name || !denomination) throw new Error("Missing required fields");

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/auth');
  }
  
  // 1. Create org
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name, denomination, tier: 'church' })
    .select()
    .single();
    
  if (orgError || !org) throw new Error(orgError?.message || "Failed to create organization");

  // 2. Get current user and update their profile to belong to this new org
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ org_id: org.id })
    .eq('id', user.id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  // 3. Create denomination config and starter funds for a useful first dashboard.
  const { error: configError } = await supabase
    .from('denomination_config')
    .insert({
      org_id: org.id,
      ...denominationTerms[denomination],
    });

  if (configError) {
    throw new Error(configError.message);
  }

  const { error: fundsError } = await supabase
    .from('funds')
    .insert(defaultFunds.map((fund) => ({
      org_id: org.id,
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
