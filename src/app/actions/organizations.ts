"use server"

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

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
  const name = formData.get('name') as string;
  const denomination = formData.get('denomination') as string;

  if (!name || !denomination) throw new Error("Missing required fields");

  const supabase = await createClient();
  
  // 1. Create org
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name, denomination, tier: 'church' })
    .select()
    .single();
    
  if (orgError || !org) throw new Error(orgError?.message || "Failed to create organization");

  // 2. Get current user and update their profile to belong to this new org
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('profiles').update({ org_id: org.id }).eq('id', user.id);
  }

  // 3. Create default denomination config
  await supabase.from('denomination_config').insert({ org_id: org.id });

  revalidatePath('/dashboard');
  return org;
}
