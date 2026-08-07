-- 1. POS Sale Item Trigger (Decrement Stock on Sale)
DROP TRIGGER IF EXISTS trg_update_stock_on_pos_item ON pos_sale_items;
CREATE TRIGGER trg_update_stock_on_pos_item
AFTER INSERT OR DELETE ON pos_sale_items
FOR EACH ROW EXECUTE FUNCTION update_stock_on_pos_sale_item();

-- 2. Restore Stock on Voided Sale Trigger
DROP TRIGGER IF EXISTS trg_restore_stock_on_void ON pos_sales;
CREATE TRIGGER trg_restore_stock_on_void
AFTER UPDATE ON pos_sales
FOR EACH ROW EXECUTE FUNCTION restore_stock_on_pos_void();

-- 3. Auto-assign Sale Number
DROP TRIGGER IF EXISTS trg_assign_sale_number ON pos_sales;
CREATE TRIGGER trg_assign_sale_number
BEFORE INSERT ON pos_sales
FOR EACH ROW EXECUTE FUNCTION assign_sale_number();

-- 4. Prevent Negative Stock on POS Items
DROP TRIGGER IF EXISTS trg_prevent_negative_stock_pos ON pos_sale_items;
CREATE TRIGGER trg_prevent_negative_stock_pos
BEFORE INSERT OR UPDATE ON pos_sale_items
FOR EACH ROW EXECUTE FUNCTION prevent_negative_stock();
