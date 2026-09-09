import { isDeclarationActive } from './declarations';

/** HMRC basic rate relief: charities reclaim 25p per £1 donated. */
export const GIFT_AID_RATE_PERCENT = 25;

export interface ClaimableDonation {
  id: string;
  donor_id: string;
  amount_pence: number;
  transaction_date: string; // YYYY-MM-DD
}

export interface ClaimableDeclaration {
  id: string;
  donor_id: string;
  effective_from: string;
  effective_to: string | null;
  revoked_at: string | null;
}

export interface ClaimRow {
  donation_id: string;
  declaration_id: string;
  gift_aid_pence: number;
}

export interface BuiltClaim {
  claimRows: ClaimRow[];
  total_donations_pence: number;
  total_gift_aid_pence: number;
}

/** Gift Aid reclaimable on a single donation, rounded to whole pence. */
export function giftAidPence(amount_pence: number): number {
  return Math.round((amount_pence * GIFT_AID_RATE_PERCENT) / 100);
}

/**
 * Select the donations eligible for a Gift Aid claim and total them.
 *
 * A donation qualifies when the donor is Gift Aid eligible, the donation is not
 * already attached to another claim, and a declaration covers the donation date.
 */
export function buildClaim(params: {
  donations: ClaimableDonation[];
  declarations: ClaimableDeclaration[];
  eligibleDonorIds: Set<string>;
  alreadyClaimedDonationIds: Set<string>;
}): BuiltClaim {
  const { donations, declarations, eligibleDonorIds, alreadyClaimedDonationIds } = params;

  const claimRows: ClaimRow[] = [];
  let total_donations_pence = 0;
  let total_gift_aid_pence = 0;

  for (const donation of donations) {
    if (!eligibleDonorIds.has(donation.donor_id)) continue;
    if (alreadyClaimedDonationIds.has(donation.id)) continue;

    const matchingDeclaration = declarations.find(
      (decl) =>
        decl.donor_id === donation.donor_id &&
        isDeclarationActive(decl, donation.transaction_date)
    );

    if (!matchingDeclaration) continue;

    const gift_aid_pence = giftAidPence(donation.amount_pence);
    claimRows.push({
      donation_id: donation.id,
      declaration_id: matchingDeclaration.id,
      gift_aid_pence,
    });
    total_donations_pence += donation.amount_pence;
    total_gift_aid_pence += gift_aid_pence;
  }

  return { claimRows, total_donations_pence, total_gift_aid_pence };
}
