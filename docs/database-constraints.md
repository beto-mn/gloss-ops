# Database Constraints & Triggers

Rules that cannot be expressed as simple CHECK constraints in PostgreSQL
because they span multiple tables. Each entry documents the business rule,
where it is enforced, and the implementation for each layer.

---

## Rule 1 — WARRANTY_CLAIM orders cannot be invoiced

**Business rule:**
A work order of type `WARRANTY_CLAIM` represents a no-cost return visit covered
by an existing warranty. Generating an invoice for it is not allowed.

**Tables involved:** `work_order`, `invoice`

**Enforcement layers:**

### Application layer (NestJS)
Validate before inserting into `invoice`:

```typescript
if (workOrder.type === 'WARRANTY_CLAIM') {
  throw new BadRequestException(
    'Cannot create an invoice for a WARRANTY_CLAIM work order'
  )
}
```

### Database layer (PostgreSQL trigger)
Last line of defense — rejects any direct `INSERT` into `invoice` that bypasses
the application:

```sql
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
```

Add this as a raw SQL migration in Prisma:

```
prisma/migrations/TIMESTAMP_add_warranty_claim_invoice_trigger/migration.sql
```

---

## Rule 2 — WARRANTY_CLAIM order must reference a valid warranty

**Business rule:**
When `work_order.type = WARRANTY_CLAIM`, the field `warranty_claim_id` must be set
and must reference a warranty that is not void and has not expired.

**Tables involved:** `work_order`, `warranty`

**Enforcement layers:**

### Application layer (NestJS)
Validate before creating a `WARRANTY_CLAIM` work order:

```typescript
if (type === 'WARRANTY_CLAIM') {
  if (!warrantyClaimId) {
    throw new BadRequestException('warrantyClaimId is required for WARRANTY_CLAIM orders')
  }
  const warranty = await prisma.warranty.findUnique({ where: { id: warrantyClaimId } })
  if (!warranty || warranty.isVoid || warranty.validUntil < new Date()) {
    throw new BadRequestException('Referenced warranty is void or expired')
  }
}
```

### Database layer (PostgreSQL trigger)

```sql
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
```
