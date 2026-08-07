-- Mejorar mensaje de error del trigger de inventario:
-- incluye el nombre del repuesto y la cantidad disponible/solicitada,
-- en lugar de solo el ID (mejor UX cuando el usuario recibe el error).
CREATE OR REPLACE FUNCTION trg_sync_part_inventory()
RETURNS TRIGGER AS $$
DECLARE
    part_name   TEXT;
    current_qty INT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        SELECT name, quantity INTO part_name, current_qty
        FROM parts WHERE id = NEW."partId";

        -- Descontar stock atómicamente (el UPDATE bloquea la fila y falla si no hay stock)
        UPDATE parts 
        SET quantity = quantity - NEW.quantity,
            "updatedAt" = NOW()
        WHERE id = NEW."partId"
          AND quantity >= NEW.quantity;
        
        -- Si no se actualizó ninguna fila => stock insuficiente (atómico, sin race condition)
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Stock insuficiente para "%" (ID %). Disponible: %, Solicitado: %',
                COALESCE(part_name, 'repuesto'), NEW."partId", COALESCE(current_qty, 0), NEW.quantity;
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
