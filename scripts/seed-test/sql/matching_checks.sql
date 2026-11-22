-- Exercises the match-decision rules from migration 020 against the seeded
-- data inside a transaction that is rolled back, so the seed is left as is.
\set ON_ERROR_STOP on
BEGIN;

CREATE FUNCTION pg_temp.expect_error(stmt text, expected text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN others THEN
    IF position(expected IN SQLERRM) = 0 THEN
      RAISE EXCEPTION 'expected error "%", got "%"', expected, SQLERRM;
    END IF;
    RETURN;
  END;
  RAISE EXCEPTION 'expected error "%", but the statement succeeded', expected;
END;
$$;

DO $$
DECLARE
  org constant uuid := '5eed0000-0000-4000-8000-000000000001';
  other_org constant uuid := '5eed0000-0000-4000-8000-0000000000ff';
  actor constant uuid := '5eed0000-0000-4000-8000-0000000000aa';
  one record;
  one2 record;
  s record;
  s2 record;
  dup uuid;
  extra uuid;
  late uuid;
  debit uuid;
  groups integer;
  n integer;
  dec_id uuid;
BEGIN
  IF to_regclass('public.match_decisions') IS NULL THEN
    RAISE NOTICE 'match_decisions not found (migration 020 not applied); skipping match-decision checks';
    RETURN;
  END IF;

  INSERT INTO auth.users (id, email) VALUES (actor, 'treasurer@example.org');
  INSERT INTO bank_lines (id, organisation_id, bank_account_id, source_reference, transaction_date,
                          amount_pence, reference, counterparty_name)
  SELECT id, organisation_id, bank_account_id, 'line-' || line_number, transaction_date,
         amount_pence, reference, counterparty_name
  FROM seed_test.bank_lines;

  SELECT m.donation_id, m.bank_line_id, d.transaction_date, d.amount_pence, b.bank_account_id INTO one
  FROM seed_test.expected_matches m JOIN donations d ON d.id = m.donation_id
  JOIN bank_lines b ON b.id = m.bank_line_id
  WHERE m.match_type = 'one_to_one' ORDER BY m.match_id LIMIT 1;
  SELECT m.donation_id, m.bank_line_id, d.transaction_date, d.amount_pence INTO one2
  FROM seed_test.expected_matches m JOIN donations d ON d.id = m.donation_id
  WHERE m.match_type = 'one_to_one' ORDER BY m.match_id OFFSET 1 LIMIT 1;
  SELECT m.donation_id, array_agg(m.bank_line_id ORDER BY m.bank_line_id) AS lines INTO s
  FROM seed_test.expected_matches m WHERE m.match_type = 'split'
  GROUP BY m.match_id, m.donation_id ORDER BY m.match_id LIMIT 1;
  SELECT m.donation_id, array_agg(m.bank_line_id ORDER BY m.bank_line_id) AS lines,
         min(d.transaction_date) AS d_date INTO s2
  FROM seed_test.expected_matches m JOIN donations d ON d.id = m.donation_id
  WHERE m.match_type = 'split'
  GROUP BY m.match_id, m.donation_id ORDER BY m.match_id OFFSET 1 LIMIT 1;

  -- One-to-one accept marks the line matched; the donation and line cannot be reused.
  SELECT count(*) INTO n FROM accept_bank_match(org, one.donation_id, ARRAY[one.bank_line_id], actor, 0.9, ARRAY['reference exact']);
  IF n <> 1 THEN RAISE EXCEPTION 'one-to-one accept returned % rows', n; END IF;
  IF (SELECT status FROM bank_lines WHERE id = one.bank_line_id) <> 'matched' THEN
    RAISE EXCEPTION 'accepted bank line not marked matched';
  END IF;
  PERFORM pg_temp.expect_error(format('select accept_bank_match(%L, %L, array[%L]::uuid[], %L)', org, one2.donation_id, one.bank_line_id, actor), 'already matched');
  INSERT INTO bank_lines (organisation_id, bank_account_id, source_reference, transaction_date, amount_pence)
  VALUES (org, one.bank_account_id, 'check-dup', one.transaction_date, one.amount_pence) RETURNING id INTO dup;
  PERFORM pg_temp.expect_error(format('select accept_bank_match(%L, %L, array[%L]::uuid[], %L)', org, one.donation_id, dup, actor), 'Donation is already matched');

  -- Split accept records both lines under one split group.
  SELECT count(*), count(DISTINCT split_group_id) INTO n, groups
  FROM accept_bank_match(org, s.donation_id, s.lines, actor);
  IF n <> 2 OR groups <> 1 THEN RAISE EXCEPTION 'split accept returned % rows in % groups', n, groups; END IF;

  -- Rule violations.
  INSERT INTO bank_lines (organisation_id, bank_account_id, source_reference, transaction_date, amount_pence)
  VALUES (org, one.bank_account_id, 'check-extra', s2.d_date, 1) RETURNING id INTO extra;
  PERFORM pg_temp.expect_error(format('select accept_bank_match(%L, %L, array[%L, %L]::uuid[], %L)', org, s2.donation_id, s2.lines[1], extra, actor), 'add up exactly');
  PERFORM pg_temp.expect_error(format('select accept_bank_match(%L, %L, array[%L]::uuid[], %L)', org, s2.donation_id, s2.lines[1], actor), 'more than 5%');
  PERFORM pg_temp.expect_error(format('select accept_bank_match(%L, %L, array[%L, %L]::uuid[], %L)', org, s2.donation_id, s2.lines[1], s2.lines[1], actor), 'two different lines');
  INSERT INTO bank_lines (organisation_id, bank_account_id, source_reference, transaction_date, amount_pence)
  VALUES (org, one.bank_account_id, 'check-late', one2.transaction_date + 6, one2.amount_pence) RETURNING id INTO late;
  PERFORM pg_temp.expect_error(format('select accept_bank_match(%L, %L, array[%L]::uuid[], %L)', org, one2.donation_id, late, actor), 'more than 5 days');
  INSERT INTO bank_lines (organisation_id, bank_account_id, source_reference, transaction_date, amount_pence)
  VALUES (org, one.bank_account_id, 'check-debit', one2.transaction_date, -one2.amount_pence) RETURNING id INTO debit;
  PERFORM pg_temp.expect_error(format('select accept_bank_match(%L, %L, array[%L]::uuid[], %L)', org, one2.donation_id, debit, actor), 'money-in');
  PERFORM pg_temp.expect_error(format('select accept_bank_match(%L, %L, array[%L]::uuid[], %L)', other_org, one2.donation_id, one2.bank_line_id, actor), 'Donation not found');

  -- Undoing one half of a split undoes both and reopens both lines; it can then be accepted again.
  SELECT id INTO dec_id FROM match_decisions WHERE donation_id = s.donation_id AND undone_at IS NULL LIMIT 1;
  SELECT count(*) INTO n FROM undo_match_decision(org, dec_id, actor);
  IF n <> 2 THEN RAISE EXCEPTION 'split undo returned % rows', n; END IF;
  SELECT count(*) INTO n FROM bank_lines WHERE id = ANY(s.lines) AND status = 'unmatched';
  IF n <> 2 THEN RAISE EXCEPTION 'split undo left % of 2 lines unmatched', n; END IF;
  PERFORM pg_temp.expect_error(format('select undo_match_decision(%L, %L, %L)', org, dec_id, actor), 'already been undone');
  SELECT count(*) INTO n FROM accept_bank_match(org, s.donation_id, s.lines, actor);
  IF n <> 2 THEN RAISE EXCEPTION 'split re-accept returned % rows', n; END IF;

  -- Rejections: once per pair, undoable, and not allowed on a matched line.
  SELECT id INTO dec_id FROM reject_bank_match(org, one2.bank_line_id, s2.donation_id, actor, 0.4, ARRAY['amount near']);
  PERFORM pg_temp.expect_error(format('select reject_bank_match(%L, %L, %L, %L)', org, one2.bank_line_id, s2.donation_id, actor), 'already been rejected');
  SELECT count(*) INTO n FROM undo_match_decision(org, dec_id, actor);
  IF n <> 1 THEN RAISE EXCEPTION 'reject undo returned % rows', n; END IF;
  PERFORM reject_bank_match(org, one2.bank_line_id, s2.donation_id, actor);
  PERFORM pg_temp.expect_error(format('select reject_bank_match(%L, %L, %L, %L)', org, one.bank_line_id, s2.donation_id, actor), 'already matched');

  -- Closed periods block accept and undo.
  SELECT id INTO dec_id FROM accept_bank_match(org, one2.donation_id, ARRAY[one2.bank_line_id], actor);
  INSERT INTO reconciliation_periods (organisation_id, year, month, status)
  VALUES (org, extract(year FROM one2.transaction_date), extract(month FROM one2.transaction_date), 'closed'),
         (org, extract(year FROM s2.d_date), extract(month FROM s2.d_date), 'closed')
  ON CONFLICT DO NOTHING;
  PERFORM pg_temp.expect_error(format('select undo_match_decision(%L, %L, %L)', org, dec_id, actor), 'closed period');
  PERFORM pg_temp.expect_error(format('select accept_bank_match(%L, %L, %L::uuid[], %L)', org, s2.donation_id, s2.lines, actor), 'closed period');

  RAISE NOTICE 'match-decision checks passed';
END $$;
ROLLBACK;
