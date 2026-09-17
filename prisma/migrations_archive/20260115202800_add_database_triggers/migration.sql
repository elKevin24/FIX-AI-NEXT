-- Resolve drift by dropping the unused table
DROP TABLE IF EXISTS "playing_with_neon";

-- 1. Inventory Sync Trigger
CREATE OR REPLACE FUNCTION update_stock_on_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE parts SET quantity = quantity - NEW.quantity WHERE id = NEW."partId";
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE parts SET quantity = quantity + OLD.quantity - NEW.quantity WHERE id = NEW."partId";
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE parts SET quantity = quantity + OLD.quantity WHERE id = OLD."partId";
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_stock_on_usage ON part_usages;
CREATE TRIGGER trg_update_stock_on_usage
AFTER INSERT OR UPDATE OR DELETE ON part_usages
FOR EACH ROW EXECUTE FUNCTION update_stock_on_usage();

-- 2. Cash Register Balance Trigger
CREATE OR REPLACE FUNCTION sync_cash_register_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.type = 'INCOME') THEN
            UPDATE cash_registers SET "expectedBalance" = "expectedBalance" + NEW.amount WHERE id = NEW."cashRegisterId";
        ELSE
            UPDATE cash_registers SET "expectedBalance" = "expectedBalance" - NEW.amount WHERE id = NEW."cashRegisterId";
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Adjust from OLD to NEW
        IF (OLD.type = 'INCOME') THEN
            UPDATE cash_registers SET "expectedBalance" = "expectedBalance" - OLD.amount WHERE id = OLD."cashRegisterId";
        ELSE
            UPDATE cash_registers SET "expectedBalance" = "expectedBalance" + OLD.amount WHERE id = OLD."cashRegisterId";
        END IF;
        IF (NEW.type = 'INCOME') THEN
            UPDATE cash_registers SET "expectedBalance" = "expectedBalance" + NEW.amount WHERE id = NEW."cashRegisterId";
        ELSE
            UPDATE cash_registers SET "expectedBalance" = "expectedBalance" - NEW.amount WHERE id = NEW."cashRegisterId";
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.type = 'INCOME') THEN
            UPDATE cash_registers SET "expectedBalance" = "expectedBalance" - OLD.amount WHERE id = OLD."cashRegisterId";
        ELSE
            UPDATE cash_registers SET "expectedBalance" = "expectedBalance" + OLD.amount WHERE id = OLD."cashRegisterId";
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_cash_register_balance ON cash_transactions;
CREATE TRIGGER trg_sync_cash_register_balance
AFTER INSERT OR UPDATE OR DELETE ON cash_transactions
FOR EACH ROW EXECUTE FUNCTION sync_cash_register_balance();

-- 3. Ticket Status Audit Trigger
CREATE OR REPLACE FUNCTION log_ticket_status_history()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO audit_logs (id, action, details, "userId", "tenantId", "createdAt")
        VALUES (
            gen_random_uuid(),
            'TICKET_STATUS_CHANGE',
            jsonb_build_object(
                'ticketId', NEW.id,
                'oldStatus', OLD.status,
                'newStatus', NEW.status
            )::text,
            COALESCE(NEW."updatedById", NEW."createdById"),
            NEW."tenantId",
            now()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_ticket_status_history ON tickets;
CREATE TRIGGER trg_log_ticket_status_history
AFTER UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION log_ticket_status_history();
