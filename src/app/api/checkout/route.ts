import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe gracefully, checking if the secret key exists in the environment
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY in environment" }, { status: 500 });
  }

  try {
    const { plan, amount } = await req.json();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `Steward SaaS — ${plan} Plan`,
            },
            unit_amount: amount * 100, // Convert to pence
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get("origin")}/dashboard?success=true`,
      cancel_url: `${req.headers.get("origin")}/auth?canceled=true`,
    });

    return NextResponse.json({ id: session.id, url: session.url });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
