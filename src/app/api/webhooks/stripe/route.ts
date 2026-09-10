import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { decideUpgrade } from '@/lib/billing/plans';

// Mark as dynamic so Next.js never tries to pre-render this route at build time
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    // 500, not 400: this is our misconfiguration, and Stripe should retry
    // once the secret is in place rather than treating it as rejected.
    console.error('STRIPE_WEBHOOK_SECRET is not set; cannot verify webhooks.');
    return NextResponse.json({ error: "Missing stripe webhook secret" }, { status: 500 });
  }

  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error("Webhook signature verification failed.", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // We must use the Service Role key to bypass RLS since Webhooks are not authenticated as users
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const decision = decideUpgrade(session);

    if (!decision.upgrade) {
      // Not an error: unpaid and unrecognised sessions are expected traffic.
      console.info(`Stripe ${event.id}: no upgrade — ${decision.reason}`);
      return NextResponse.json({ received: true, upgraded: false });
    }

    const { error } = await supabaseAdmin
      .from('organizations')
      .update({ tier: decision.tier })
      .eq('id', decision.org_id);

    if (error) {
      // Return 500 so Stripe retries. Returning 200 here would mark the event
      // delivered and leave a paying organisation on its old tier.
      console.error(`Stripe ${event.id}: failed to set tier for ${decision.org_id}:`, error.message);
      return NextResponse.json({ error: 'Failed to apply upgrade' }, { status: 500 });
    }

    return NextResponse.json({ received: true, upgraded: true });
  }

  return NextResponse.json({ received: true });
}
