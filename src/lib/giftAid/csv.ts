export interface CsvDonationRow {
  donor_display_name: string;
  transaction_date: string;  // YYYY-MM-DD
  amount_pence: number;
}

function splitName(displayName: string): { first: string; last: string } {
  const idx = displayName.indexOf(' ');
  if (idx === -1) return { first: displayName, last: '' };
  return { first: displayName.slice(0, idx), last: displayName.slice(idx + 1) };
}

function formatAmount(pence: number): string {
  return (pence / 100).toFixed(2);
}

const CSV_HEADERS = [
  'Donor title',
  'Donor first name',
  'Donor last name',
  'House name or number',
  'Postcode',
  'Donation date',
  'Donation amount',
];

function csvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCharitiesOnlineCsv(rows: CsvDonationRow[]): string {
  const lines: string[] = [CSV_HEADERS.join(',')];

  for (const row of rows) {
    const { first, last } = splitName(row.donor_display_name);
    const cells = [
      '',
      csvCell(first),
      csvCell(last),
      '',
      '',
      row.transaction_date,
      formatAmount(row.amount_pence),
    ];
    lines.push(cells.join(','));
  }

  return lines.join('\n');
}
