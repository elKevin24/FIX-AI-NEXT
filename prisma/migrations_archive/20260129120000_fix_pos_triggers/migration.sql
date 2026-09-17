-- 1. POS Sale Item Trigger (Decrement Stock on Sale)
CREATE OR REPLACE FUNCTION update_stock_on_pos_sale_item()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE parts SET quantity = quantity - NEW.quantity WHERE id = NEW."partId";
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE parts SET quantity = quantity + OLD.quantity WHERE id = OLD."partId";
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_stock_on_pos_item ON pos_sale_items;
CREATE TRIGGER trg_update_stock_on_pos_item
AFTER INSERT OR DELETE ON pos_sale_items
FOR EACH ROW EXECUTE FUNCTION update_stock_on_pos_sale_item();

-- 2. Restore Stock on Voided Sale Trigger
-- This trigger listens for updates on the 'pos_sales' table.
-- If the status changes to 'VOIDED', it iterates through the items and restores stock.
CREATE OR REPLACE FUNCTION restore_stock_on_pos_void()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
BEGIN
    -- Only run if status changed to VOIDED
    IF (OLD.status != 'VOIDED' AND NEW.status = 'VOIDED') THEN
        FOR item IN SELECT * FROM pos_sale_items WHERE "saleId" = NEW.id LOOP
            UPDATE parts 
            SET quantity = quantity + item.quantity 
            WHERE id = item."partId";
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_restore_stock_on_void ON pos_sales;
CREATE TRIGGER trg_restore_stock_on_void
AFTER UPDATE ON pos_sales
FOR EACH ROW EXECUTE FUNCTION restore_stock_on_pos_void();
