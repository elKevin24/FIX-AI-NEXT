-- ==========================================
-- TRIGGER 1: INVENTARIO ATÓMICO (part_usages)
-- ==========================================
CREATE OR REPLACE FUNCTION trg_sync_part_inventory()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- Descontar stock al usar un repuesto
        UPDATE parts 
        SET quantity = quantity - NEW.quantity,
            "updatedAt" = NOW()
        WHERE id = NEW."partId";
        
        -- Evitar stock negativo atómicamente
        IF (SELECT quantity FROM parts WHERE id = NEW."partId") < 0 THEN
            RAISE EXCEPTION 'Stock insuficiente para el repuesto ID %', NEW."partId";
        END IF;

    ELSIF (TG_OP = 'DELETE') THEN
        -- Devolver stock al remover un repuesto o cancelar un ticket
        UPDATE parts 
        SET quantity = quantity + OLD.quantity,
            "updatedAt" = NOW()
        WHERE id = OLD."partId";
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_part_inventory_trigger ON part_usages;
CREATE TRIGGER sync_part_inventory_trigger
AFTER INSERT OR DELETE ON part_usages
FOR EACH ROW EXECUTE FUNCTION trg_sync_part_inventory();


-- ==========================================
-- TRIGGER 2: CORRELATIVOS UNÍVOCOS (tickets)
-- ==========================================
CREATE OR REPLACE FUNCTION trg_assign_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
    next_seq INT;
BEGIN
    -- Solo generar si no viene provisto por la aplicación
    IF NEW."ticketNumber" IS NULL OR NEW."ticketNumber" = '' THEN
        SELECT COALESCE(MAX(CAST(NULLIF(regexp_replace("ticketNumber", '\D', '', 'g'), '') AS INT)), 0) + 1
        INTO next_seq
        FROM tickets
        WHERE "tenantId" = NEW."tenantId";

        NEW."ticketNumber" := 'TK-' || lpad(next_seq::text, 6, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assign_ticket_number_trigger ON tickets;
CREATE TRIGGER assign_ticket_number_trigger
BEFORE INSERT ON tickets
FOR EACH ROW EXECUTE FUNCTION trg_assign_ticket_number();
