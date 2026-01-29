CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
DECLARE
    audit_action TEXT;
    audit_details JSONB;
    user_id TEXT;
    tenant_id TEXT;
BEGIN
    -- FILTRO INTELIGENTE: Ignorar actualizaciones que SOLO cambian cantidad/stock
    -- Esto reduce drásticamente el ruido generado por ventas diarias.
    IF (TG_OP = 'UPDATE') THEN
        IF (
            (OLD.price IS NOT DISTINCT FROM NEW.price) AND 
            (OLD.cost IS NOT DISTINCT FROM NEW.cost) AND
            (OLD.name IS NOT DISTINCT FROM NEW.name) AND
            (OLD.sku IS NOT DISTINCT FROM NEW.sku)
            -- Si precio, costo, nombre y SKU son iguales, asumimos que es solo movimiento de stock
            -- y lo ignoramos para no llenar la tabla de logs.
        ) THEN
            RETURN NULL;
        END IF;
    END IF;

    -- Lógica estándar para INSERT/DELETE o UPDATE relevante
    IF (TG_OP = 'INSERT') THEN
        audit_action := 'DB_CREATE_' || TG_TABLE_NAME;
        audit_details := jsonb_build_object('new', row_to_json(NEW));
        BEGIN tenant_id := NEW."tenantId"; EXCEPTION WHEN OTHERS THEN tenant_id := NULL; END;
        BEGIN user_id := NEW."updatedById"; EXCEPTION WHEN OTHERS THEN user_id := NULL; END;
        
    ELSIF (TG_OP = 'UPDATE') THEN
        audit_action := 'DB_UPDATE_' || TG_TABLE_NAME;
        audit_details := jsonb_build_object(
            'old', row_to_json(OLD),
            'new', row_to_json(NEW),
            'diff', (
                SELECT jsonb_object_agg(key, value)
                FROM jsonb_each(row_to_json(NEW)::jsonb)
                WHERE row_to_json(OLD)::jsonb -> key IS DISTINCT FROM value
            )
        );
        BEGIN tenant_id := NEW."tenantId"; EXCEPTION WHEN OTHERS THEN tenant_id := NULL; END;
        BEGIN user_id := NEW."updatedById"; EXCEPTION WHEN OTHERS THEN user_id := NULL; END;

    ELSIF (TG_OP = 'DELETE') THEN
        audit_action := 'DB_DELETE_' || TG_TABLE_NAME;
        audit_details := jsonb_build_object('old', row_to_json(OLD));
        BEGIN tenant_id := OLD."tenantId"; EXCEPTION WHEN OTHERS THEN tenant_id := NULL; END;
        user_id := NULL;
    END IF;

    -- Insertar Log
    IF tenant_id IS NOT NULL THEN
        INSERT INTO audit_logs (
            id, action, details, "userId", "tenantId", "createdAt"
        )
        VALUES (
            gen_random_uuid(),
            audit_action,
            audit_details::text,
            user_id,
            tenant_id,
            NOW()
        );
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
