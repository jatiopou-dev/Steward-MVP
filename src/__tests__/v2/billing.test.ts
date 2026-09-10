import { describe, it, expect } from 'vitest';
import {
  PLANS,
  getPlan,
  decideUpgrade,
  type CheckoutSessionLike,
} from '@/lib/billing/plans';

const ORG = 'org-123';

/** A session as Stripe sends it for a successful card payment. */
const paidSession = (over: Partial<CheckoutSessionLike> = {}): CheckoutSessionLike => ({
  payment_status: 'paid',
  amount_total: PLANS.premium.amount_pence,
  currency: 'gbp',
  metadata: { org_id: ORG, plan: 'premium' },
  ...over,
});

// ── catalogue ─────────────────────────────────────────────────────────────

describe('plan catalogue', () => {
  it('prices premium at £49', () => {
    expect(PLANS.premium.amount_pence).toBe(4900);
  });

  it('grants the network tier for premium', () => {
    expect(PLANS.premium.grants_tier).toBe('network');
  });

  it('looks a plan up by id', () => {
    expect(getPlan('premium')?.id).toBe('premium');
  });

  it('returns null for an unknown plan', () => {
    expect(getPlan('enterprise')).toBeNull();
  });

  it('returns null for a missing plan id', () => {
    expect(getPlan(undefined)).toBeNull();
    expect(getPlan(null)).toBeNull();
    expect(getPlan('')).toBeNull();
  });
});

// ── the happy path ────────────────────────────────────────────────────────

describe('decideUpgrade — granting', () => {
  it('upgrades a paid session for a known plan', () => {
    expect(decideUpgrade(paidSession())).toEqual({
      upgrade: true,
      org_id: ORG,
      tier: 'network',
      plan_id: 'premium',
    });
  });

  it('accepts an overpayment', () => {
    const d = decideUpgrade(paidSession({ amount_total: 9999 }));
    expect(d.upgrade).toBe(true);
  });

  it('accepts an uppercase currency', () => {
    const d = decideUpgrade(paidSession({ currency: 'GBP' }));
    expect(d.upgrade).toBe(true);
  });
});

// ── payment must actually have cleared ────────────────────────────────────

describe('decideUpgrade — unpaid sessions', () => {
  it('refuses an unpaid session, which delayed payment methods produce', () => {
    const d = decideUpgrade(paidSession({ payment_status: 'unpaid' }));
    expect(d.upgrade).toBe(false);
    if (!d.upgrade) expect(d.reason).toMatch(/payment_status/);
  });

  it('refuses a session awaiting payment', () => {
    expect(decideUpgrade(paidSession({ payment_status: 'no_payment_required' })).upgrade).toBe(false);
  });

  it('refuses a session with no payment_status at all', () => {
    expect(decideUpgrade(paidSession({ payment_status: null })).upgrade).toBe(false);
  });
});

// ── the underpayment hole this closes ─────────────────────────────────────

describe('decideUpgrade — amount is checked against the catalogue', () => {
  it('refuses a session that paid a penny', () => {
    const d = decideUpgrade(paidSession({ amount_total: 1 }));
    expect(d.upgrade).toBe(false);
    if (!d.upgrade) expect(d.reason).toMatch(/underpaid/);
  });

  it('refuses a session a penny short of the price', () => {
    const d = decideUpgrade(paidSession({ amount_total: PLANS.premium.amount_pence - 1 }));
    expect(d.upgrade).toBe(false);
  });

  it('refuses a zero-value session', () => {
    expect(decideUpgrade(paidSession({ amount_total: 0 })).upgrade).toBe(false);
  });

  it('refuses a session with no amount', () => {
    expect(decideUpgrade(paidSession({ amount_total: null })).upgrade).toBe(false);
  });

  it('accepts payment of exactly the listed price', () => {
    const d = decideUpgrade(paidSession({ amount_total: PLANS.premium.amount_pence }));
    expect(d.upgrade).toBe(true);
  });
});

// ── metadata ──────────────────────────────────────────────────────────────

describe('decideUpgrade — metadata', () => {
  it('refuses a session with no org_id', () => {
    const d = decideUpgrade(paidSession({ metadata: { plan: 'premium' } }));
    expect(d.upgrade).toBe(false);
    if (!d.upgrade) expect(d.reason).toMatch(/org_id/);
  });

  it('refuses a session with no metadata at all', () => {
    expect(decideUpgrade(paidSession({ metadata: null })).upgrade).toBe(false);
  });

  it('refuses an unknown plan', () => {
    const d = decideUpgrade(paidSession({ metadata: { org_id: ORG, plan: 'enterprise' } }));
    expect(d.upgrade).toBe(false);
    if (!d.upgrade) expect(d.reason).toMatch(/unknown plan/);
  });

  it('refuses a session with no plan recorded', () => {
    const d = decideUpgrade(paidSession({ metadata: { org_id: ORG } }));
    expect(d.upgrade).toBe(false);
  });

  it('grants the tier the plan lists, not one named in metadata', () => {
    const d = decideUpgrade(
      paidSession({ metadata: { org_id: ORG, plan: 'premium' } })
    );
    if (d.upgrade) expect(d.tier).toBe(PLANS.premium.grants_tier);
  });
});

// ── currency ──────────────────────────────────────────────────────────────

describe('decideUpgrade — currency', () => {
  it('refuses a session settled in another currency', () => {
    const d = decideUpgrade(paidSession({ currency: 'usd' }));
    expect(d.upgrade).toBe(false);
    if (!d.upgrade) expect(d.reason).toMatch(/currency/);
  });

  it('allows a session with no currency reported', () => {
    expect(decideUpgrade(paidSession({ currency: null })).upgrade).toBe(true);
  });
});

// ── a refusal never leaks an upgrade ──────────────────────────────────────

describe('decideUpgrade — refusals carry no grant', () => {
  const bad: CheckoutSessionLike[] = [
    paidSession({ payment_status: 'unpaid' }),
    paidSession({ amount_total: 1 }),
    paidSession({ metadata: null }),
    paidSession({ metadata: { org_id: ORG, plan: 'nope' } }),
    paidSession({ currency: 'eur' }),
  ];

  it('gives a reason and no tier for every rejected session', () => {
    for (const session of bad) {
      const d = decideUpgrade(session);
      expect(d.upgrade).toBe(false);
      expect(d).not.toHaveProperty('tier');
      if (!d.upgrade) expect(d.reason.length).toBeGreaterThan(0);
    }
  });
});
