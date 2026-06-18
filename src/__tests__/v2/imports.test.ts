import { describe, it, expect } from 'vitest';
import {
  createImportBatchSchema,
  importDonationRowSchema,
  importDonationsSchema,
  listDonationsSchema,
} from '@/lib/validation/v2';
import { mapBankCsvRow } from '@/lib/importMaps/bankCsv';
import { mapStripeRow } from '@/lib/importMaps/stripe';

const uuid = '12345678-1234-4234-8234-123456789abc';

// ── createImportBatchSchema ────────────────────────────────────────────────

describe('createImportBatchSchema', () => {
  it('accepts valid bank_csv batch', () => {
    const result = createImportBatchSchema.safeParse({
      organisation_id: uuid,
      source: 'bank_csv',
      filename: 'barclays-jan-2024.csv',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid stripe batch with bank_account_id', () => {
    const result = createImportBatchSchema.safeParse({
      organisation_id: uuid,
      source: 'stripe',
      filename: 'stripe-export.csv',
      bank_account_id: uuid,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid source', () => {
    const result = createImportBatchSchema.safeParse({
      organisation_id: uuid,
      source: 'paypal',
      filename: 'export.csv',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing filename', () => {
    const result = createImportBatchSchema.safeParse({
      organisation_id: uuid,
      source: 'bank_csv',
    });
    expect(result.success).toBe(false);
  });
});

// ── importDonationRowSchema ────────────────────────────────────────────────

describe('importDonationRowSchema', () => {
  it('accepts valid row', () => {
    const result = importDonationRowSchema.safeParse({
      source_reference: 'TXN-001',
      amount_pence: 5000,
      transaction_date: '2024-01-15',
      raw_row: { Date: '15/01/2024', Credit: '50.00' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-integer amount', () => {
    const result = importDonationRowSchema.safeParse({
      source_reference: 'TXN-001',
      amount_pence: 50.5,
      transaction_date: '2024-01-15',
      raw_row: {},
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/integer/);
    }
  });

  it('rejects zero amount', () => {
    const result = importDonationRowSchema.safeParse({
      source_reference: 'TXN-001',
      amount_pence: 0,
      transaction_date: '2024-01-15',
      raw_row: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = importDonationRowSchema.safeParse({
      source_reference: 'TXN-001',
      amount_pence: 5000,
      transaction_date: '15/01/2024',
      raw_row: {},
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/YYYY-MM-DD/);
    }
  });

  it('accepts optional donor_email', () => {
    const result = importDonationRowSchema.safeParse({
      source_reference: 'TXN-001',
      amount_pence: 5000,
      transaction_date: '2024-01-15',
      donor_email: 'donor@example.com',
      raw_row: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid donor_email', () => {
    const result = importDonationRowSchema.safeParse({
      source_reference: 'TXN-001',
      amount_pence: 5000,
      transaction_date: '2024-01-15',
      donor_email: 'not-an-email',
      raw_row: {},
    });
    expect(result.success).toBe(false);
  });
});

// ── importDonationsSchema ─────────────────────────────────────────────────

describe('importDonationsSchema', () => {
  it('accepts valid input', () => {
    const result = importDonationsSchema.safeParse({
      batch_id: uuid,
      organisation_id: uuid,
      rows: [
        {
          source_reference: 'TXN-001',
          amount_pence: 5000,
          transaction_date: '2024-01-15',
          raw_row: {},
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty rows array', () => {
    const result = importDonationsSchema.safeParse({
      batch_id: uuid,
      organisation_id: uuid,
      rows: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/At least one row/);
    }
  });
});

// ── listDonationsSchema ───────────────────────────────────────────────────

describe('listDonationsSchema', () => {
  it('accepts organisation_id only', () => {
    const result = listDonationsSchema.safeParse({ organisation_id: uuid });
    expect(result.success).toBe(true);
  });

  it('accepts all optional filters', () => {
    const result = listDonationsSchema.safeParse({
      organisation_id: uuid,
      appeal_id: uuid,
      batch_id: uuid,
      date_from: '2024-01-01',
      date_to: '2024-12-31',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid date_from format', () => {
    const result = listDonationsSchema.safeParse({
      organisation_id: uuid,
      date_from: '01-01-2024',
    });
    expect(result.success).toBe(false);
  });
});

// ── mapBankCsvRow ─────────────────────────────────────────────────────────

describe('mapBankCsvRow', () => {
  it('maps a valid UK bank CSV row', () => {
    const row = {
      Date: '15/01/2024',
      Description: 'Sunday offering',
      Credit: '150.00',
      Debit: '',
      'Transaction ID': 'TXN-12345',
    };
    const result = mapBankCsvRow(row);
    expect(result).not.toBeNull();
    expect(result?.amount_pence).toBe(15000);
    expect(result?.transaction_date).toBe('2024-01-15');
    expect(result?.source_reference).toBe('TXN-12345');
    expect(result?.description).toBe('Sunday offering');
  });

  it('returns null for debit-only row (no credit)', () => {
    const row = {
      Date: '15/01/2024',
      Description: 'Bank charge',
      Credit: '',
      Debit: '5.00',
    };
    expect(mapBankCsvRow(row)).toBeNull();
  });

  it('returns null for zero credit', () => {
    const row = {
      Date: '15/01/2024',
      Description: 'Zero',
      Credit: '0.00',
    };
    expect(mapBankCsvRow(row)).toBeNull();
  });

  it('generates fallback source_reference when no Transaction ID', () => {
    const row = {
      Date: '15/01/2024',
      Description: 'Offering',
      Credit: '50.00',
    };
    const result = mapBankCsvRow(row);
    expect(result).not.toBeNull();
    expect(result?.source_reference).toContain('2024-01-15');
  });

  it('strips pound sign and commas from credit', () => {
    const row = {
      Date: '15/01/2024',
      Description: 'Large gift',
      Credit: '£1,500.00',
      'Transaction ID': 'TXN-999',
    };
    const result = mapBankCsvRow(row);
    expect(result?.amount_pence).toBe(150000);
  });
});

// ── mapStripeRow ──────────────────────────────────────────────────────────

describe('mapStripeRow', () => {
  it('maps a valid Stripe export row', () => {
    const row = {
      id: 'ch_abc123',
      'created (UTC)': '2024-01-15 14:32:00',
      amount: '5000',
      currency: 'gbp',
      description: 'Online giving',
      customer_email: 'donor@example.com',
      status: 'paid',
    };
    const result = mapStripeRow(row);
    expect(result).not.toBeNull();
    expect(result?.source_reference).toBe('ch_abc123');
    expect(result?.amount_pence).toBe(5000);
    expect(result?.transaction_date).toBe('2024-01-15');
    expect(result?.donor_email).toBe('donor@example.com');
  });

  it('returns null for non-paid status', () => {
    const row = {
      id: 'ch_abc123',
      'created (UTC)': '2024-01-15 14:32:00',
      amount: '5000',
      currency: 'gbp',
      description: '',
      customer_email: '',
      status: 'failed',
    };
    expect(mapStripeRow(row)).toBeNull();
  });

  it('returns null for missing id', () => {
    const row = {
      id: '',
      'created (UTC)': '2024-01-15 14:32:00',
      amount: '5000',
      currency: 'gbp',
      description: '',
      customer_email: '',
      status: 'paid',
    };
    expect(mapStripeRow(row)).toBeNull();
  });

  it('accepts succeeded status', () => {
    const row = {
      id: 'pi_xyz789',
      'created (UTC)': '2024-03-10 09:00:00',
      amount: '2500',
      currency: 'gbp',
      description: '',
      customer_email: '',
      status: 'succeeded',
    };
    const result = mapStripeRow(row);
    expect(result).not.toBeNull();
    expect(result?.amount_pence).toBe(2500);
  });

  it('omits donor_email when empty string', () => {
    const row = {
      id: 'ch_empty',
      'created (UTC)': '2024-01-15 14:32:00',
      amount: '1000',
      currency: 'gbp',
      description: '',
      customer_email: '',
      status: 'paid',
    };
    const result = mapStripeRow(row);
    expect(result?.donor_email).toBeUndefined();
  });
});
