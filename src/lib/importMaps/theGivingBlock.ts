import type { ImportDonationRow } from '@/lib/validation/v2';

/**
 * Maps a The Giving Block settlement CSV row to ImportDonationRow.
 * Returns null if row should be skipped (missing required fields, zero/negative amount).
 *
 * Expected headers (The Giving Block settlement export):
 *   Settlement Date, Settlement Amount (GBP), Transaction ID,
 *   Donor Name, Cryptocurrency, Crypto Amount, Exchange Rate
 *
 * Settlement Date format: YYYY-MM-DD
 * Settlement Amount (GBP): decimal string e.g. "50.00"
 * Transaction ID: unique per donation — used as source_reference
 */
export function mapTheGivingBlockRow(
  row: Record<string, string>
): ImportDonationRow | null {
  const get = (keys: string[]): string => {
    for (const key of keys) {
      const found = Object.keys(row).find(
        (k) => k.trim().toLowerCase() === key.toLowerCase()
      );
      if (found && row[found]?.trim()) return row[found].trim();
    }
    return '';
  };

  const source_reference = get(['transaction id', 'txid', 'tx id', 'id']);
  if (!source_reference) return null;

  const amountStr = get(['settlement amount (gbp)', 'settlement amount', 'amount (gbp)', 'amount']);
  if (!amountStr) return null;
  const amountFloat = parseFloat(amountStr.replace(/[£,]/g, ''));
  if (isNaN(amountFloat) || amountFloat <= 0) return null;
  const amount_pence = Math.round(amountFloat * 100);

  const rawDate = get(['settlement date', 'date']);
  if (!rawDate) return null;
  // Expect YYYY-MM-DD; handle DD/MM/YYYY fallback
  let transaction_date = rawDate;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
    const [day, month, year] = rawDate.split('/');
    transaction_date = `${year}-${month}-${day}`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(transaction_date)) return null;

  const donorName = get(['donor name', 'donor', 'name']) || undefined;

  return {
    source_reference,
    amount_pence,
    transaction_date,
    description: donorName ? `Crypto donation from ${donorName}` : 'Crypto donation',
    raw_row: row as Record<string, unknown>,
  };
}
