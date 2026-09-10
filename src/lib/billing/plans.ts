/**
 * Server-authoritative plan catalogue.
 *
 * Prices live here, never in the request body. The checkout route looks the
 * amount up by plan id so a caller cannot choose what it pays, and the webhook
 * looks the granted tier up the same way.
 */

export type OrganisationTier = 'seed' | 'church' | 'network';

export interface Plan {
  id: string;
  label: string;
  amount_pence: number;
  /** Tier granted once payment for this plan has cleared. */
  grants_tier: OrganisationTier;
}

export const PLANS = {
  premium: {
    id: 'premium',
    label: 'Steward Premium',
    amount_pence: 4900,
    grants_tier: 'network',
  },
} as const satisfies Record<string, Plan>;

export type PlanId = keyof typeof PLANS;

export function getPlan(planId: string | null | undefined): Plan | null {
  if (!planId) return null;
  return (PLANS as Record<string, Plan>)[planId] ?? null;
}

/** Stripe checkout session fields this module needs. */
export interface CheckoutSessionLike {
  payment_status?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  metadata?: { org_id?: string; plan?: string } | null;
}

export type UpgradeDecision =
  | { upgrade: true; org_id: string; tier: OrganisationTier; plan_id: string }
  | { upgrade: false; reason: string };

/**
 * Whether a completed checkout session should grant a tier.
 *
 * checkout.session.completed also fires for delayed payment methods before the
 * money arrives, so payment_status must say 'paid' before anything is granted.
 * The amount is checked against the catalogue so an underpaid session — one
 * created before a price change, or by a caller supplying its own amount —
 * never grants the tier.
 */
export function decideUpgrade(session: CheckoutSessionLike): UpgradeDecision {
  const org_id = session.metadata?.org_id;
  if (!org_id) return { upgrade: false, reason: 'no org_id in session metadata' };

  if (session.payment_status !== 'paid') {
    return { upgrade: false, reason: `payment_status is ${session.payment_status ?? 'missing'}` };
  }

  const plan = getPlan(session.metadata?.plan);
  if (!plan) {
    return { upgrade: false, reason: `unknown plan: ${session.metadata?.plan ?? '(none)'}` };
  }

  if (session.currency && session.currency.toLowerCase() !== 'gbp') {
    return { upgrade: false, reason: `unexpected currency: ${session.currency}` };
  }

  const paid = session.amount_total ?? 0;
  if (paid < plan.amount_pence) {
    return {
      upgrade: false,
      reason: `underpaid: ${paid} < ${plan.amount_pence} for plan ${plan.id}`,
    };
  }

  return { upgrade: true, org_id, tier: plan.grants_tier, plan_id: plan.id };
}
