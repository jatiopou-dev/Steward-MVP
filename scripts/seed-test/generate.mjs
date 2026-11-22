#!/usr/bin/env node
// Generates fictional donations and bank lines for a TEST database only.
// Output (default ./out): seed.sql, bank_lines.csv, donations.csv,
// expected_matches.csv, expected_unmatched.csv. Same --seed => identical output.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  })
);
const SEED = Number(args.seed ?? 20261122);
const OUT_DIR = resolve(args.out ?? join(dirname(fileURLToPath(import.meta.url)), 'out'));

const COUNTS = {
  oneToOne: 166, // donations matched by exactly one bank line
  split: 14, // donations paid across two bank lines
  unmatchedDonations: 20, // no bank line
  unmatchedBankLines: 6, // fees, interest, near-miss decoys
  misspelledRefs: 20, // matched bank lines with a corrupted reference
  missingRefs: 16, // matched bank lines with no reference
};
const MAX_DATE_GAP = 5;

// ---- deterministic randomness ------------------------------------------------
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const weighted = (pairs) => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of pairs) if ((r -= w) < 0) return v;
  return pairs[pairs.length - 1][0];
};
const uuid = () => {
  const h = Array.from({ length: 32 }, () => Math.floor(rand() * 16).toString(16));
  h[12] = '4';
  h[16] = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  const s = h.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
};

// ---- dates -------------------------------------------------------------------
const START = Date.UTC(2026, 8, 1); // 2026-09-01
const DAY = 86400000;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const addDays = (isoDate, n) => iso(Date.parse(isoDate) + n * DAY);
const dayDiff = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / DAY);

// ---- fixed entities ------------------------------------------------------------
// Fixed IDs so re-running replaces the same seed organisation.
const ORG_ID = '5eed0000-0000-4000-8000-000000000001';
const BANK_ACCOUNT_ID = '5eed0000-0000-4000-8000-000000000002';
const BATCH_IDS = {
  bank_csv: '5eed0000-0000-4000-8000-000000000003',
  stripe: '5eed0000-0000-4000-8000-000000000004',
};

const APPEALS = [
  ['TITHE', 'Tithes and offerings'],
  ['BLDG', 'Building fund'],
  ['MISSION', 'Mission partners'],
  ['YOUTH', 'Youth work'],
  ['FOOD', 'Food bank'],
].map(([code, name]) => ({ id: uuid(), code, name }));

const FIRST = ['Amara', 'Ben', 'Chloe', 'Daniel', 'Esther', 'Femi', 'Grace', 'Hugh', 'Isla', 'Joseph',
  'Kezia', 'Liam', 'Miriam', 'Nathan', 'Olu', 'Priya', 'Ruth', 'Samuel', 'Tobi', 'Zara'];
const LAST = ['Adeyemi', 'Brightwater', 'Castellan', 'Dunmore', 'Ellsworth', 'Fairbairn', 'Greythorn',
  'Hollins', 'Iverson', 'Jessop', 'Kettering', 'Lindqvist', 'Mabry', 'Northcott', 'Okonkwo-Hale',
  'Penhaligon', 'Quarrie', 'Rookwood', 'Stanhope', 'Thistlewood'];
const usedNames = new Set();
const DONORS = Array.from({ length: 45 }, (_, i) => {
  let first, last;
  do {
    first = pick(FIRST);
    last = pick(LAST);
  } while (usedNames.has(first + last));
  usedNames.add(first + last);
  return {
    id: uuid(),
    first,
    last,
    display_name: `${first} ${last}`,
    email: `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, '') + '@example.org',
    external_reference: `GIV${String(1000 + i * 7).padStart(4, '0')}`,
    gift_aid_eligible: rand() < 0.6,
  };
});

// ---- messiness helpers -----------------------------------------------------------
const LOOKALIKE = { 0: 'O', 1: 'I', 5: 'S', 8: 'B', O: '0', I: '1', S: '5', B: '8' };
function misspell(ref) {
  const ops = [
    (s) => { // swap two adjacent characters
      const i = int(0, s.length - 2);
      return s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2);
    },
    (s) => { const i = int(0, s.length - 1); return s.slice(0, i) + s.slice(i + 1); }, // drop one
    (s) => { // visually similar substitution
      const idx = [...s].map((c, i) => (LOOKALIKE[c] ? i : -1)).filter((i) => i >= 0);
      if (!idx.length) return s + s.slice(-1);
      const i = pick(idx);
      return s.slice(0, i) + LOOKALIKE[s[i]] + s.slice(i + 1);
    },
    (s) => s.replace('-', ' ').toLowerCase(), // case / separator
    (s) => s.replace('-', ''), // missing separator
    (s) => { const i = int(1, s.length - 1); return s.slice(0, i) + s[i] + s.slice(i); }, // doubled char
  ];
  let out = ref;
  while (out === ref) out = pick(ops)(ref);
  return out;
}
function misspellName(name) {
  if (name.length < 5) return name;
  const i = int(1, name.length - 3);
  return name.slice(0, i) + name[i + 1] + name[i] + name.slice(i + 2);
}
const counterparty = (d, sloppy) => {
  const last = sloppy ? misspellName(d.last) : d.last;
  return pick([`${d.first[0]} ${last}`, `${d.first} ${last}`, `MR/MRS ${d.first[0]} ${last}`, `${last} ${d.first[0]}`]).toUpperCase();
};
const AMOUNTS = [500, 1000, 1000, 1500, 2000, 2000, 2500, 3000, 5000, 5000, 7500, 10000, 15000, 25000];
const amount = () => (rand() < 0.75 ? pick(AMOUNTS) : int(3, 400) * 100 + pick([0, 0, 50, 99, 1]));
const DATE_GAPS = [[0, 30], [1, 20], [2, 15], [3, 12], [4, 8], [5, 7], [-1, 5], [-2, 3]];

// ---- donations ------------------------------------------------------------------
const TOTAL_DONATIONS = COUNTS.oneToOne + COUNTS.split + COUNTS.unmatchedDonations;
const kinds = shuffle([
  ...Array(COUNTS.oneToOne).fill('one_to_one'),
  ...Array(COUNTS.split).fill('split'),
  ...Array(COUNTS.unmatchedDonations).fill('unmatched'),
]);
const donations = kinds.map((kind, i) => {
  const donor = rand() < 0.92 ? pick(DONORS) : null;
  const appeal = rand() < 0.9 ? pick(APPEALS) : null;
  const source = rand() < 0.75 ? 'bank_csv' : 'stripe';
  const date = iso(START + int(5, 75) * DAY);
  const ref = `STW-${String(1001 + i * 3 + int(0, 2)).padStart(5, '0')}`;
  const amount_pence = kind === 'split' ? int(40, 600) * 100 + pick([0, 50]) : amount();
  return {
    id: uuid(),
    kind,
    donor,
    appeal,
    source,
    source_reference: ref,
    amount_pence,
    transaction_date: date,
    description: `${appeal ? appeal.name : 'General'} gift${donor ? ` from ${donor.display_name}` : ''}`,
  };
});

// ---- bank lines ------------------------------------------------------------------
const bankLines = [];
const matches = [];
const TYPES = ['FASTER PAYMENT', 'STANDING ORDER', 'BANK GIRO CREDIT', 'BACS'];
function bankLine({ donation, amount_pence, part }) {
  const gap = weighted(DATE_GAPS);
  const d = donation.donor;
  const line = {
    id: uuid(),
    transaction_date: addDays(donation.transaction_date, gap),
    amount_pence,
    counterparty_name: d ? counterparty(d, rand() < 0.15) : pick(['CASH DEPOSIT', 'ANON DONOR', 'ONLINE GIVING']),
    clean_reference: part ? `${donation.source_reference} PT${part}` : donation.source_reference,
    reference_quality: 'exact',
    type: donation.source === 'stripe' ? 'STRIPE PAYMENTS UK' : pick(TYPES),
  };
  bankLines.push(line);
  matches.push({ donation, line, gap, part });
}
for (const donation of donations) {
  if (donation.kind === 'one_to_one') bankLine({ donation, amount_pence: donation.amount_pence });
  if (donation.kind === 'split') {
    const first = Math.round((donation.amount_pence * int(30, 70)) / 100);
    bankLine({ donation, amount_pence: first, part: 1 });
    bankLine({ donation, amount_pence: donation.amount_pence - first, part: 2 });
  }
}
// Corrupt a fixed number of matched references.
const messy = shuffle(bankLines);
messy.slice(0, COUNTS.misspelledRefs).forEach((l) => (l.reference_quality = 'misspelled'));
messy.slice(COUNTS.misspelledRefs, COUNTS.misspelledRefs + COUNTS.missingRefs)
  .forEach((l) => (l.reference_quality = 'missing'));
for (const l of bankLines) {
  l.reference = l.reference_quality === 'exact' ? l.clean_reference
    : l.reference_quality === 'misspelled' ? misspell(l.clean_reference) : null;
}

// Unmatched lines: fees, interest and near-miss decoys that should NOT match.
const decoys = [];
const near = shuffle(donations.filter((d) => d.kind === 'one_to_one' && d.donor));
const unmatchedSpecs = [
  { amount_pence: -int(500, 1500), counterparty_name: 'BANK', type: 'SERVICE CHARGE', reference: 'MONTHLY FEE', reason: 'bank_fee' },
  { amount_pence: -int(200, 900), counterparty_name: 'BANK', type: 'CARD FEES', reference: 'STRIPE FEES', reason: 'bank_fee' },
  { amount_pence: int(50, 400), counterparty_name: 'BANK', type: 'INTEREST', reference: 'GROSS INTEREST', reason: 'interest' },
  { amount_pence: 50000, counterparty_name: 'STEWARD SEED SAVINGS', type: 'TRANSFER', reference: 'FROM SAVINGS', reason: 'internal_transfer' },
];
for (const n of near.slice(0, COUNTS.unmatchedBankLines - unmatchedSpecs.length)) {
  // Same donor and amount as a real donation, but outside the date window and with a different reference.
  unmatchedSpecs.push({
    amount_pence: n.amount_pence,
    counterparty_name: counterparty(n.donor, false),
    type: 'FASTER PAYMENT',
    reference: `STW-${int(90000, 99999)}`,
    reason: 'near_miss_outside_date_window',
    date: addDays(n.transaction_date, pick([-1, 1]) * int(MAX_DATE_GAP + 4, MAX_DATE_GAP + 12)),
  });
}
for (const s of unmatchedSpecs) {
  decoys.push({
    id: uuid(),
    transaction_date: s.date ?? iso(START + int(5, 80) * DAY),
    amount_pence: s.amount_pence,
    counterparty_name: s.counterparty_name,
    reference: s.reference,
    reference_quality: null,
    type: s.type,
    reason: s.reason,
  });
}
const allLines = [...bankLines, ...decoys].sort(
  (a, b) => a.transaction_date.localeCompare(b.transaction_date) || a.id.localeCompare(b.id)
);
allLines.forEach((l, i) => {
  l.line_number = i + 1;
  l.description = [l.type, l.counterparty_name, l.reference].filter(Boolean).join(' ');
});

// ---- sanity checks -----------------------------------------------------------------
const assert = (cond, msg) => { if (!cond) throw new Error(`Generator invariant failed: ${msg}`); };
assert(donations.length === TOTAL_DONATIONS, 'donation count');
assert(allLines.length === COUNTS.oneToOne + COUNTS.split * 2 + COUNTS.unmatchedBankLines, 'bank line count');
assert(new Set(donations.map((d) => d.source_reference)).size === donations.length, 'unique references');
for (const m of matches) assert(Math.abs(m.gap) <= MAX_DATE_GAP, 'date gap');
for (const l of allLines) assert(l.amount_pence !== 0, 'non-zero amounts');
for (const d of donations.filter((x) => x.kind === 'split')) {
  const parts = matches.filter((m) => m.donation === d);
  assert(parts.length === 2 && parts.every((p) => p.line.amount_pence > 0), 'split parts positive');
  assert(parts.reduce((s, p) => s + p.line.amount_pence, 0) === d.amount_pence, 'split sum');
}

// ---- writers -----------------------------------------------------------------------
const q = (v) => (v === null || v === undefined ? 'NULL'
  : typeof v === 'number' || typeof v === 'boolean' ? String(v)
  : `'${String(v).replace(/'/g, "''")}'`);
const qj = (o) => `${q(JSON.stringify(o))}::jsonb`;
const values = (rows) => rows.map((r) => `  (${r.map(q).join(', ')})`).join(',\n');
const csvCell = (v) => (v === null || v === undefined ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const csv = (header, rows) => [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';

const sql = [];
sql.push(`-- GENERATED by scripts/seed-test/generate.mjs (seed ${SEED}). FICTIONAL TEST DATA ONLY.
\\set ON_ERROR_STOP on
BEGIN;

-- Remove any previous run (cascades to donors, appeals, bank account, batches, donations).
DELETE FROM organisations WHERE id = ${q(ORG_ID)};
DROP SCHEMA IF EXISTS seed_test CASCADE;
CREATE SCHEMA seed_test;
COMMENT ON SCHEMA seed_test IS 'Fictional reconciliation test data. Not for production.';

CREATE TABLE seed_test.bank_lines (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  bank_account_id uuid NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  line_number integer NOT NULL UNIQUE,
  transaction_date date NOT NULL,
  description text NOT NULL,
  counterparty_name text,
  reference text,
  amount_pence integer NOT NULL,
  currency text NOT NULL DEFAULT 'GBP'
);

CREATE TABLE seed_test.expected_matches (
  match_id integer NOT NULL,
  match_type text NOT NULL CHECK (match_type IN ('one_to_one', 'split')),
  donation_id uuid NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  bank_line_id uuid NOT NULL REFERENCES seed_test.bank_lines(id) ON DELETE CASCADE,
  reference_quality text NOT NULL CHECK (reference_quality IN ('exact', 'misspelled', 'missing')),
  date_offset_days integer NOT NULL,
  PRIMARY KEY (donation_id, bank_line_id)
);
`);
sql.push(`INSERT INTO organisations (id, name, type, country, currency) VALUES
  (${q(ORG_ID)}, 'SEED TEST - Fictional Community Church', 'church', 'GB', 'GBP');
INSERT INTO bank_accounts (id, organisation_id, name, account_last4) VALUES
  (${q(BANK_ACCOUNT_ID)}, ${q(ORG_ID)}, 'Seed Test Current Account', '0000');
`);
sql.push(`INSERT INTO appeals (id, organisation_id, code, name) VALUES\n${values(APPEALS.map((a) => [a.id, ORG_ID, a.code, a.name]))};\n`);
sql.push(`INSERT INTO donors (id, organisation_id, display_name, email, external_reference, gift_aid_eligible) VALUES\n${values(
  DONORS.map((d) => [d.id, ORG_ID, d.display_name, d.email, d.external_reference, d.gift_aid_eligible]))};\n`);
for (const [source, id] of Object.entries(BATCH_IDS)) {
  const n = donations.filter((d) => d.source === source).length;
  sql.push(`INSERT INTO donation_import_batches (id, organisation_id, bank_account_id, source, filename, row_count, imported_count, status, raw_headers) VALUES
  (${q(id)}, ${q(ORG_ID)}, ${source === 'bank_csv' ? q(BANK_ACCOUNT_ID) : 'NULL'}, ${q(source)}, ${q(`seed-test-${source}.csv`)}, ${n}, ${n}, 'complete', ${qj(['date', 'amount', 'reference', 'donor', 'appeal'])});\n`);
}
sql.push(`INSERT INTO donations (id, organisation_id, import_batch_id, appeal_id, donor_id, source, source_reference, amount_pence, currency, transaction_date, description, raw_row, status) VALUES\n${donations.map((d) =>
  `  (${[d.id, ORG_ID, BATCH_IDS[d.source], d.appeal?.id ?? null, d.donor?.id ?? null, d.source, d.source_reference, d.amount_pence, 'GBP', d.transaction_date, d.description].map(q).join(', ')}, ${qj({
    date: d.transaction_date, amount: (d.amount_pence / 100).toFixed(2), reference: d.source_reference,
    donor: d.donor?.display_name ?? '', appeal: d.appeal?.code ?? '' })}, 'imported')`).join(',\n')};\n`);
sql.push(`INSERT INTO seed_test.bank_lines (id, organisation_id, bank_account_id, line_number, transaction_date, description, counterparty_name, reference, amount_pence) VALUES\n${values(
  allLines.map((l) => [l.id, ORG_ID, BANK_ACCOUNT_ID, l.line_number, l.transaction_date, l.description, l.counterparty_name, l.reference, l.amount_pence]))};\n`);

const matchIds = new Map();
const matchRows = matches.map((m) => {
  if (!matchIds.has(m.donation.id)) matchIds.set(m.donation.id, matchIds.size + 1);
  return { ...m, match_id: matchIds.get(m.donation.id), match_type: m.part ? 'split' : 'one_to_one' };
}).sort((a, b) => a.match_id - b.match_id || (a.part ?? 0) - (b.part ?? 0));
sql.push(`INSERT INTO seed_test.expected_matches (match_id, match_type, donation_id, bank_line_id, reference_quality, date_offset_days) VALUES\n${values(
  matchRows.map((m) => [m.match_id, m.match_type, m.donation.id, m.line.id, m.line.reference_quality, m.gap]))};\n\nCOMMIT;\n`);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'seed.sql'), sql.join('\n'));
writeFileSync(join(OUT_DIR, 'bank_lines.csv'), csv(
  ['line_number', 'bank_line_id', 'date', 'description', 'counterparty', 'reference', 'amount'],
  allLines.map((l) => [l.line_number, l.id, l.transaction_date, l.description, l.counterparty_name, l.reference, (l.amount_pence / 100).toFixed(2)])));
writeFileSync(join(OUT_DIR, 'donations.csv'), csv(
  ['donation_id', 'reference', 'date', 'amount_pence', 'donor_name'],
  donations.map((d) => [d.id, d.source_reference, d.transaction_date, d.amount_pence, d.donor?.display_name ?? null])));
writeFileSync(join(OUT_DIR, 'expected_matches.csv'), csv(
  ['match_id', 'match_type', 'donation_id', 'donation_reference', 'donation_date', 'donation_amount_pence',
    'bank_line_id', 'bank_line_number', 'bank_date', 'bank_amount_pence', 'bank_reference', 'reference_quality', 'date_offset_days'],
  matchRows.map((m) => [m.match_id, m.match_type, m.donation.id, m.donation.source_reference, m.donation.transaction_date,
    m.donation.amount_pence, m.line.id, m.line.line_number, m.line.transaction_date, m.line.amount_pence, m.line.reference,
    m.line.reference_quality, dayDiff(m.line.transaction_date, m.donation.transaction_date)])));
writeFileSync(join(OUT_DIR, 'expected_unmatched.csv'), csv(
  ['side', 'id', 'reference', 'date', 'amount_pence', 'reason'],
  [...donations.filter((d) => d.kind === 'unmatched').map((d) => ['donation', d.id, d.source_reference, d.transaction_date, d.amount_pence, 'no_bank_line']),
    ...decoys.map((l) => ['bank_line', l.id, l.reference, l.transaction_date, l.amount_pence, l.reason])]));

const q2 = (k) => bankLines.filter((l) => l.reference_quality === k).length;
console.log(`Seed ${SEED} -> ${OUT_DIR}
  donations:       ${donations.length} (${COUNTS.oneToOne} one-to-one, ${COUNTS.split} split, ${COUNTS.unmatchedDonations} unmatched)
  bank lines:      ${allLines.length} (${bankLines.length} matched, ${decoys.length} unmatched)
  references:      ${q2('exact')} exact, ${q2('misspelled')} misspelled, ${q2('missing')} missing
  max date gap:    ${Math.max(...matches.map((m) => Math.abs(m.gap)))} days`);
