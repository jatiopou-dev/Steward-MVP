import type { ImportDonationRow } from '@/lib/validation/v2';

/**
 * Maps a generic UK bank CSV row to ImportDonationRow.
 * Returns null if row should be skipped (debit-only, zero credit, missing reference).
 *
 * Expected headers (case-insensitive lookup):
 *   Date, Description, Credit, Debit, Transaction ID (or Reference or Ref)
 *
 * Date format: DD/MM/YYYY
 */
export function mapBankCsvRow(
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

  const creditStr = get(['credit', 'amount', 'in']);
  if (!creditStr) return null;

  const creditFloat = parseFloat(creditStr.replace(/[£,]/g, ''));
  if (isNaN(creditFloat) || creditFloat <= 0) return null;

  const amount_pence = Math.round(creditFloat * 100);

  const rawDate = get(['date', 'transaction date', 'value date']);
  if (!rawDate) return null;

  // Parse DD/MM/YYYY → YYYY-MM-DD
  const parts = rawDate.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  const transaction_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(transaction_date)) return null;

  const description = get(['description', 'details', 'narrative', 'reference']) || '';

  const source_reference =
    get(['transaction id', 'transaction reference', 'ref', 'reference', 'id']) ||
    `${transaction_date}-${description.slice(0, 40)}-${amount_pence}`;

  return {
    source_reference,
    amount_pence,
    transaction_date,
    description: description || undefined,
    raw_row: row as Record<string, unknown>,
  };
}
