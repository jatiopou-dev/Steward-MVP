import type { ImportDonationRow } from '@/lib/validation/v2';

/**
 * Maps a Stripe dashboard CSV export row to ImportDonationRow.
 * Returns null if row should be skipped (not paid/succeeded, missing id, zero amount).
 *
 * Expected headers (standard Stripe dashboard export):
 *   id, created (UTC), amount, currency, description, customer_email, status
 *
 * amount: integer pence (Stripe exports minor units for GBP)
 * created (UTC): ISO timestamp e.g. 2024-01-15 14:32:00
 */
export function mapStripeRow(
  row: Record<string, string>
): ImportDonationRow | null {
  const get = (key: string): string => {
    const found = Object.keys(row).find(
      (k) => k.trim().toLowerCase() === key.toLowerCase()
    );
    return found ? (row[found]?.trim() ?? '') : '';
  };

  const status = get('status').toLowerCase();
  if (status !== 'paid' && status !== 'succeeded') return null;

  const source_reference = get('id');
  if (!source_reference) return null;

  const amountStr = get('amount');
  const amount_pence = parseInt(amountStr, 10);
  if (isNaN(amount_pence) || amount_pence <= 0) return null;

  // Parse "2024-01-15 14:32:00" → "2024-01-15"
  const createdRaw = get('created (utc)') || get('created');
  if (!createdRaw) return null;
  const transaction_date = createdRaw.split(' ')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(transaction_date)) return null;

  const description = get('description') || undefined;
  const donor_email = get('customer_email') || undefined;

  return {
    source_reference,
    amount_pence,
    transaction_date,
    description,
    donor_email: donor_email && donor_email !== '' ? donor_email : undefined,
    raw_row: row as Record<string, unknown>,
  };
}
