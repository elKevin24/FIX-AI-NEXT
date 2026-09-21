-- Endurecer el trigger de inventario: check de stock atómico
CREATE OR REPLACE FUNCTION trg_sync_part_inventory()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- Descontar stock atómicamente (el UPDATE bloquea la fila y falla si no hay stock)
        UPDATE parts 
        SET quantity = quantity - NEW.quantity,
            "updatedAt" = NOW()
        WHERE id = NEW."partId"
          AND quantity >= NEW.quantity;
        
        -- Si no se actualizó ninguna fila => stock insuficiente (atómico, sin race condition)
        IF NOT FOUND THEN
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
