"use server"

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getTransactions() {
  const supabase = await createClient();
  
  // RLS will automatically filter these down to the user's org_id
  const { data, error } = await supabase
    .from('transactions')
    .select('*, profiles(full_name)')
    .order('date', { ascending: false });

  if (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
  return data;
}

export async function addTransaction(amountPence: number, profileId?: string) {
  const supabase = await createClient();
  
  // We must fetch the user's org_id to insert the transaction
  const { data: profile } = await supabase.from('profiles').select('org_id').single();
  if (!profile?.org_id) throw new Error("User profile not found or user does not belong to an organization");

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      amount_pence: amountPence,
      profile_id: profileId || null,
      org_id: profile.org_id
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  
  revalidatePath('/dashboard/transactions');
  return data;
}
