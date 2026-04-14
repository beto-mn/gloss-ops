-- Rule 1: Prevent invoices for WARRANTY_CLAIM work orders
CREATE OR REPLACE FUNCTION prevent_warranty_claim_invoice()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT type FROM work_order WHERE id = NEW.work_order_id) = 'WARRANTY_CLAIM' THEN
    RAISE EXCEPTION 'Cannot create invoice for a WARRANTY_CLAIM work order';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_work_order_type_before_invoice
BEFORE INSERT ON invoice
FOR EACH ROW EXECUTE FUNCTION prevent_warranty_claim_invoice();

-- Rule 2: Validate WARRANTY_CLAIM orders reference a valid warranty
CREATE OR REPLACE FUNCTION validate_warranty_claim_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'WARRANTY_CLAIM' THEN
    IF NEW.warranty_claim_id IS NULL THEN
      RAISE EXCEPTION 'warranty_claim_id is required when type is WARRANTY_CLAIM';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM warranty
      WHERE id = NEW.warranty_claim_id
        AND is_void = false
        AND valid_until >= NOW()
    ) THEN
      RAISE EXCEPTION 'Referenced warranty is void or expired';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_warranty_claim_before_insert
BEFORE INSERT ON work_order
FOR EACH ROW EXECUTE FUNCTION validate_warranty_claim_order();
