-- Función Maestra de Auditoría
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
DECLARE
    audit_action TEXT;
    audit_details JSONB;
    user_id TEXT;
    tenant_id TEXT;
BEGIN
    -- Determinar la acción (CREATE, UPDATE, DELETE)
    IF (TG_OP = 'INSERT') THEN
        audit_action := 'DB_CREATE_' || TG_TABLE_NAME;
        audit_details := jsonb_build_object('new', row_to_json(NEW));
        -- Intentar obtener tenant/user de la nueva fila
        -- Usamos manejo de excepciones por si la columna no existe
        BEGIN
            tenant_id := NEW."tenantId";
        EXCEPTION WHEN OTHERS THEN tenant_id := NULL; END;
        BEGIN
            user_id := NEW."updatedById"; -- O createdById, pero updated es más común en cambios
        EXCEPTION WHEN OTHERS THEN user_id := NULL; END;
        
    ELSIF (TG_OP = 'UPDATE') THEN
        audit_action := 'DB_UPDATE_' || TG_TABLE_NAME;
        -- Guardar OLD y NEW para ver qué cambió
        audit_details := jsonb_build_object(
            'old', row_to_json(OLD),
            'new', row_to_json(NEW),
            'diff', (
                SELECT jsonb_object_agg(key, value)
                FROM jsonb_each(row_to_json(NEW)::jsonb)
                WHERE row_to_json(OLD)::jsonb -> key IS DISTINCT FROM value
            )
        );
        BEGIN
            tenant_id := NEW."tenantId";
        EXCEPTION WHEN OTHERS THEN tenant_id := NULL; END;
        BEGIN
            user_id := NEW."updatedById";
        EXCEPTION WHEN OTHERS THEN user_id := NULL; END;

    ELSIF (TG_OP = 'DELETE') THEN
        audit_action := 'DB_DELETE_' || TG_TABLE_NAME;
        audit_details := jsonb_build_object('old', row_to_json(OLD));
        BEGIN
            tenant_id := OLD."tenantId";
        EXCEPTION WHEN OTHERS THEN tenant_id := NULL; END;
        user_id := NULL; -- Al borrar, a veces no sabemos quién fue si no es soft-delete
    END IF;

    -- Insertar en la tabla audit_logs existente
    -- Usamos gen_random_uuid() si no tienes pgcrypto activado, o uuid_generate_v4()
    -- Asumimos que tenant_id es obligatorio en tu esquema, si es NULL el insert podría fallar si no manejamos el caso.
    -- Para evitar errores, solo auditamos si tenemos tenant_id.
    
    IF tenant_id IS NOT NULL THEN
        INSERT INTO audit_logs (
            id, 
            action, 
            details, 
            "userId", 
            "tenantId", 
            "createdAt"
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

    RETURN NULL; -- Trigger AFTER, retorno irrelevante
END;
$$ LANGUAGE plpgsql;

-- Activar el Trigger en la tabla 'parts' (Inventario)
DROP TRIGGER IF EXISTS trg_audit_parts ON parts;
CREATE TRIGGER trg_audit_parts
AFTER INSERT OR UPDATE OR DELETE ON parts
FOR EACH ROW EXECUTE FUNCTION audit_changes();
