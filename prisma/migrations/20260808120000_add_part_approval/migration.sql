-- ==========================================
-- Aprobación de repuestos por el cliente
-- ==========================================
-- El cliente debe autorizar cada repuesto antes de descontarlo del inventario.
-- part_usages.approved=false => repuesto PROPUESTO (aún no consume stock).
-- part_usages.approved=true  => repuesto AUTORIZADO (consume stock al aprobarse).

ALTER TABLE part_usages
    ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS "approvedById" UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS "priceAtProposal" DECIMAL(10,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS part_usages_approved_idx ON part_usages(approved);

-- Backfill: los registros históricos ya consumieron stock al insertarse,
-- así que se consideran aprobados y se fija el precio propuesto.
UPDATE part_usages pu
SET approved = true,
    "priceAtProposal" = COALESCE(p.price, 0)
FROM parts p
WHERE p.id = pu."partId";

-- ==========================================
-- Trigger de inventario consciente de aprobación
-- ==========================================
-- INSERT aprobado => descuento atómico (con mensaje de stock insuficiente).
-- UPDATE false->true (aprobación) => descuento atómico.
-- UPDATE true->false (des-aprobación) => devuelve stock.
-- DELETE solo devuelve stock si el uso había sido aprobado.
CREATE OR REPLACE FUNCTION trg_sync_part_inventory()
RETURNS TRIGGER AS $$
DECLARE
    part_name   TEXT;
    current_qty INT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF NEW.approved THEN
            SELECT name, quantity INTO part_name, current_qty
            FROM parts WHERE id = NEW."partId";

            UPDATE parts
            SET quantity = quantity - NEW.quantity,
                "updatedAt" = NOW()
            WHERE id = NEW."partId"
              AND quantity >= NEW.quantity;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Stock insuficiente para "%" (ID %). Disponible: %, Solicitado: %',
                    COALESCE(part_name, 'repuesto'), NEW."partId", COALESCE(current_qty, 0), NEW.quantity;
            END IF;
        END IF;

    ELSIF (TG_OP = 'UPDATE') THEN
        IF NOT OLD.approved AND NEW.approved THEN
            SELECT name, quantity INTO part_name, current_qty
            FROM parts WHERE id = NEW."partId";

            UPDATE parts
            SET quantity = quantity - NEW.quantity,
                "updatedAt" = NOW()
            WHERE id = NEW."partId"
              AND quantity >= NEW.quantity;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Stock insuficiente para "%" (ID %). Disponible: %, Solicitado: %',
                    COALESCE(part_name, 'repuesto'), NEW."partId", COALESCE(current_qty, 0), NEW.quantity;
            END IF;

        ELSIF OLD.approved AND NOT NEW.approved THEN
            UPDATE parts
            SET quantity = quantity + NEW.quantity,
                "updatedAt" = NOW()
            WHERE id = NEW."partId";
        END IF;

    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.approved THEN
            UPDATE parts
            SET quantity = quantity + OLD.quantity,
                "updatedAt" = NOW()
            WHERE id = OLD."partId";
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- El trigger también debe dispararse en UPDATE (momento de la aprobación)
DROP TRIGGER IF EXISTS sync_part_inventory_trigger ON part_usages;
CREATE TRIGGER sync_part_inventory_trigger
AFTER INSERT OR UPDATE OR DELETE ON part_usages
FOR EACH ROW EXECUTE FUNCTION trg_sync_part_inventory();

-- ==========================================
-- Acciones de auditoría para aprobación de repuestos
-- ==========================================
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PARTS_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PARTS_REJECTED';
