# Test seed: donations and bank lines

Puts fictional reconciliation data into a **test database only**: 200 `donations` and 200 bank lines, plus an answer key listing the correct matches. All names, emails (`@example.org`) and references are made up.

## Run it

Needs Docker and Node 20+.

```bash
./scripts/seed-test/run.sh
```

This starts a throwaway Postgres 17 container (`steward-seed-test`, port `54329`). It adds a minimal stand-in for Supabase's `auth` schema, applies `supabase/schema.sql` and every file in `supabase/migrations/`, loads the seed, then checks it against the answer key. The container keeps running so you can inspect it:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54329/postgres
./scripts/seed-test/run.sh --down   # remove the container when done
```

To seed a local test database that already has the schema (for example `supabase start`):

```bash
SEED_TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  ./scripts/seed-test/run.sh --existing
```

`--existing` only accepts `localhost`, `127.0.0.1`, `[::1]` or `host.docker.internal`. It always refuses hosted Supabase URLs and the project linked in `supabase/.temp`. Re-running is safe: it replaces the previous seed organisation and the `seed_test` schema.

Optional settings: `SEED_TEST_SEED` (a different but repeatable dataset), `SEED_TEST_PG_PORT`, `SEED_TEST_PG_IMAGE`.

## What gets created

| Where | Contents |
| --- | --- |
| `organisations`, `bank_accounts`, `appeals`, `donors`, `donation_import_batches`, `donations` | One test organisation (ID `5eed0000-0000-4000-8000-000000000001`) and 200 donations |
| `seed_test.bank_lines` | 200 bank statement lines (test-only schema, not a migration) |
| `seed_test.expected_matches` | The answer key, one row per donation and bank line pair |

Files written to `scripts/seed-test/out/` (git-ignored):

- `expected_matches.csv`: the known correct matches.
- `expected_unmatched.csv`: donations with no bank line, and bank lines that should not match.
- `bank_lines.csv`: the bank lines as a CSV statement.
- `donations.csv`: the donations as a CSV, used by the matching-engine test (`src/__tests__/v2/bankMatching.test.ts`).
- `seed.sql`: the generated SQL.

After the seed is verified, `run.sh` also runs `sql/matching_checks.sql`. It copies the seeded bank lines into the real `bank_lines` table (migration 020) and checks the match-decision rules: accept, split accept, undo, reject, amount and date limits, and closed periods. It runs inside a transaction that is rolled back, so the seed is left as it was.

## Messy cases

| Case | Count |
| --- | --- |
| Clean one-to-one matches (reference may still be messy) | 166 donations |
| Donation split across two bank lines (amounts add up exactly) | 14 donations (28 lines) |
| Misspelled reference (swapped, dropped or doubled characters, `0`/`O` lookalikes, case or separator changes) | 20 lines |
| Missing reference | 16 lines |
| Bank date differs from donation date | -2 to +5 days, never more than 5 |
| Misspelled counterparty name | about 15% of lines |
| Donations with no bank line | 20 |
| Bank lines that must not match (fees, interest, savings transfer, same donor and amount but 9 or more days away) | 6 |

## Evaluate the matching engine

```bash
npm run eval:matching                   # default seed
SEED_TEST_SEED=42 npm run eval:matching # another repeatable dataset
```

Generates the seed into a temporary directory (no database needed), runs `rankCandidates` from `src/lib/reconciliation/candidates.ts`, and prints top-1 and top-3 accuracy over the 194 bank lines that have a known donation, every miss with its top three candidates, and any candidates given to the 6 decoy lines.

To generate only the files, without a database: `node scripts/seed-test/generate.mjs --out=/tmp/seed`.
