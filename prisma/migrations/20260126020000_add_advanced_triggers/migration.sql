-- 1. Protect Stock (Ticket Usage)
CREATE OR REPLACE FUNCTION prevent_negative_stock()
RETURNS TRIGGER AS $$
DECLARE
    current_stock INTEGER;
BEGIN
    SELECT quantity INTO current_stock FROM parts WHERE id = NEW."partId";
    
    -- If part doesn't exist, let FK constraint handle it, or ignore.
    IF current_stock IS NULL THEN
        RETURN NEW;
    END IF;

    IF (current_stock - NEW.quantity) < 0 THEN
        RAISE EXCEPTION 'Stock insuficiente para la parte % (Actual: %, Solicitado: %)', 
            NEW."partId", current_stock, NEW.quantity;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_negative_stock ON part_usages;
CREATE TRIGGER trg_prevent_negative_stock
BEFORE INSERT ON part_usages
FOR EACH ROW EXECUTE FUNCTION prevent_negative_stock();



-- 3. Ticket Number Sequence (Per Tenant)
CREATE OR REPLACE FUNCTION assign_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    IF NEW."ticketNumber" IS NULL THEN
        -- Only consider T-XXXX format
        SELECT COALESCE(MAX(CAST(SUBSTRING("ticketNumber" FROM '[0-9]+$') AS INTEGER)), 0) + 1
        INTO next_num
        FROM tickets 
        WHERE "tenantId" = NEW."tenantId"
        AND "ticketNumber" ~ '^T-\d+$'; 

        NEW."ticketNumber" := 'T-' || next_num;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_ticket_number ON tickets;
CREATE TRIGGER trg_assign_ticket_number
BEFORE INSERT ON tickets
FOR EACH ROW EXECUTE FUNCTION assign_ticket_number();
