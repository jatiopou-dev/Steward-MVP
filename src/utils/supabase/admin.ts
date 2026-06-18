import { createClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS.
// NEVER import this in client components or expose to browser.
// Only used in server actions for writes that bootstrap their own permissions.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
