-- Migration 006: Link transactions to funds and keep fund balances synchronized.
-- Existing fund balances become opening balances. Existing transactions remain unlinked.

ALTER TABLE funds
  ADD COLUMN IF NOT EXISTS opening_balance_pence BIGINT NOT NULL DEFAULT 0;

UPDATE funds
SET opening_balance_pence = balance_pence
WHERE opening_balance_pence = 0
  AND balance_pence <> 0;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS fund_id UUID REFERENCES funds(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS transactions_fund_id_idx ON transactions (fund_id);

CREATE OR REPLACE FUNCTION public.sync_transaction_fund_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_org_id UUID;
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.fund_id IS NOT NULL THEN
    SELECT org_id INTO target_org_id
    FROM funds
    WHERE id = NEW.fund_id;

    IF target_org_id IS NULL OR target_org_id <> NEW.org_id THEN
      RAISE EXCEPTION 'Transaction fund must belong to the same organisation';
    END IF;
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.fund_id IS NOT NULL THEN
    UPDATE funds
    SET balance_pence = balance_pence - OLD.amount_pence
    WHERE id = OLD.fund_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.fund_id IS NOT NULL THEN
    UPDATE funds
    SET balance_pence = balance_pence + NEW.amount_pence
    WHERE id = NEW.fund_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transactions_sync_fund_balance ON transactions;
CREATE TRIGGER transactions_sync_fund_balance
  AFTER INSERT OR UPDATE OF amount_pence, fund_id OR DELETE
  ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_transaction_fund_balance();
