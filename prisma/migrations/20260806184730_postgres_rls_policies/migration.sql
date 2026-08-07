-- Habilitar RLS en tablas Multi-Tenant
DO $$ 
DECLARE
    t_name text;
    tables text[] := ARRAY[
        'users', 'customers', 'tickets', 'ticket_attachments', 'parts', 
        'purchase_orders', 'purchase_items', 'audit_logs', 'ticket_notes', 
        'service_templates', 'template_default_parts', 'ticket_services', 
        'technician_specializations', 'technician_unavailabilities', 
        'notifications', 'invoices', 'payments', 'cash_registers', 
        'cash_transactions', 'tenant_settings', 'invoice_history', 
        'pos_sales', 'pos_sale_items', 'pos_sale_payments', 'pos_quotations', 
        'pos_quotation_items', 'credit_notes', 'credit_note_items', 
        'session_logs', 'user_presence'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables LOOP
        -- Verificar si la tabla existe y tiene la columna tenantId
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = t_name AND column_name = 'tenantId'
        ) THEN
            -- Habilitar RLS
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t_name);
            EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t_name);
            
            -- Crear Política
            EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', t_name);
            EXECUTE format('
                CREATE POLICY tenant_isolation_policy ON %I
                FOR ALL
                USING (
                    "tenantId"::text = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::text
                    OR current_setting(''app.bypass_rls'', true) = ''on''
                );
            ', t_name);
        END IF;
    END LOOP;
END $$;
