-- Crear usuario adminkev@example.com

-- Primero, obtener el primer tenant disponible
DO $$
DECLARE
    tenant_id_var VARCHAR;
BEGIN
    -- Obtener el primer tenant
    SELECT id INTO tenant_id_var FROM tenants ORDER BY "createdAt" ASC LIMIT 1;
    
    -- Eliminar el usuario si existe
    DELETE FROM users WHERE email = 'adminkev@example.com';
    
    -- Crear el usuario nuevo
    -- Password hash para 'password123' con bcrypt rounds=12
    INSERT INTO users (id, email, name, password, role, "tenantId", "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'adminkev@example.com',
        'Admin Kev',
        '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeWjWovO5G5qr3fTi', -- password123
        'ADMIN',
        tenant_id_var,
        NOW(),
        NOW()
    );
    
    -- Mostrar info
    RAISE NOTICE 'Usuario adminkev@example.com creado exitosamente';
    RAISE NOTICE 'Password: password123';
    RAISE NOTICE 'Tenant ID: %', tenant_id_var;
END $$;

-- Verificar el usuario creado
SELECT 
    u.email,
    u.name,
    u.role,
    t.name as tenant_name
FROM users u
JOIN tenants t ON u."tenantId" = t.id
WHERE u.email = 'adminkev@example.com';
