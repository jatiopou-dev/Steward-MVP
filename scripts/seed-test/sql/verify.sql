-- Checks the seeded data against the expected-matches answer key.
\set ON_ERROR_STOP on
DO $$
DECLARE
  org constant uuid := '5eed0000-0000-4000-8000-000000000001';
  n integer;
BEGIN
  SELECT count(*) INTO n FROM donations WHERE organisation_id = org;
  IF n <> 200 THEN RAISE EXCEPTION 'expected 200 donations, found %', n; END IF;

  SELECT count(*) INTO n FROM seed_test.bank_lines WHERE organisation_id = org;
  IF n <> 200 THEN RAISE EXCEPTION 'expected 200 bank lines, found %', n; END IF;

  -- The answer key must be complete: 166 one-to-one + 14 split donations over 194 bank lines.
  SELECT count(*) INTO n FROM seed_test.expected_matches;
  IF n <> 194 THEN RAISE EXCEPTION 'expected 194 answer-key rows, found %', n; END IF;
  SELECT count(DISTINCT donation_id) INTO n FROM seed_test.expected_matches WHERE match_type = 'one_to_one';
  IF n <> 166 THEN RAISE EXCEPTION 'expected 166 one-to-one donations in the answer key, found %', n; END IF;
  SELECT count(DISTINCT donation_id) INTO n FROM seed_test.expected_matches WHERE match_type = 'split';
  IF n <> 14 THEN RAISE EXCEPTION 'expected 14 split donations in the answer key, found %', n; END IF;

  -- Every matched donation's bank lines must sum to the donation amount.
  SELECT count(*) INTO n FROM (
    SELECT d.id FROM donations d
    JOIN seed_test.expected_matches m ON m.donation_id = d.id
    JOIN seed_test.bank_lines b ON b.id = m.bank_line_id
    GROUP BY d.id, d.amount_pence
    HAVING sum(b.amount_pence) <> d.amount_pence
  ) bad;
  IF n > 0 THEN RAISE EXCEPTION '% matches do not sum to the donation amount', n; END IF;

  SELECT count(*) INTO n FROM seed_test.expected_matches m
  JOIN donations d ON d.id = m.donation_id
  JOIN seed_test.bank_lines b ON b.id = m.bank_line_id
  WHERE abs(b.transaction_date - d.transaction_date) > 5
     OR (b.transaction_date - d.transaction_date) <> m.date_offset_days;
  IF n > 0 THEN RAISE EXCEPTION '% matches have a wrong or >5 day date offset', n; END IF;

  SELECT count(*) INTO n FROM (
    SELECT donation_id FROM seed_test.expected_matches WHERE match_type = 'split'
    GROUP BY donation_id HAVING count(*) <> 2
  ) bad;
  IF n > 0 THEN RAISE EXCEPTION '% split donations do not have exactly 2 bank lines', n; END IF;

  SELECT count(*) INTO n FROM (
    SELECT bank_line_id FROM seed_test.expected_matches GROUP BY bank_line_id HAVING count(*) > 1
  ) bad;
  IF n > 0 THEN RAISE EXCEPTION '% bank lines are matched more than once', n; END IF;

  IF NOT EXISTS (SELECT 1 FROM seed_test.expected_matches WHERE reference_quality = 'misspelled')
     OR NOT EXISTS (SELECT 1 FROM seed_test.expected_matches WHERE reference_quality = 'missing')
     OR NOT EXISTS (SELECT 1 FROM seed_test.expected_matches WHERE match_type = 'split')
     OR NOT EXISTS (SELECT 1 FROM seed_test.expected_matches WHERE abs(date_offset_days) = 5) THEN
    RAISE EXCEPTION 'messy cases missing from the seed';
  END IF;
END
$$;

SELECT match_type, reference_quality, count(*) AS bank_lines,
       min(date_offset_days) AS min_offset, max(date_offset_days) AS max_offset
FROM seed_test.expected_matches
GROUP BY 1, 2 ORDER BY 1, 2;
