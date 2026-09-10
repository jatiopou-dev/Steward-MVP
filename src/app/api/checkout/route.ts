import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';
import { getPlan } from '@/lib/billing/plans';

// Initialize Stripe gracefully, checking if the secret key exists in the environment
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY in environment" }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let org_id = '';
  
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
    if (profile?.org_id) {
      org_id = profile.org_id;
    }
  }

  if (!org_id) {
    return NextResponse.json({ error: "You must be signed in to an organisation to check out" }, { status: 401 });
  }

  try {
    const { plan: planId } = await req.json();

    // The price is taken from the server-side catalogue. Any amount supplied by
    // the caller is ignored, so a request cannot choose what it pays.
    const plan = getPlan(planId);
    if (!plan) {
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `Steward SaaS — ${plan.label}`,
            },
            unit_amount: plan.amount_pence,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get("origin")}/dashboard?success=true`,
      cancel_url: `${req.headers.get("origin")}/auth?canceled=true`,
      metadata: {
        org_id: org_id,
        plan: plan.id,
      },
    });

    return NextResponse.json({ id: session.id, url: session.url });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
