#!/bin/bash

echo "═══════════════════════════════════════════════════════════"
echo "🔍 Verificación de Datos de la Base de Datos"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Query para verificar tenants y tickets
npx prisma db execute --stdin <<'EOF'
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.slug as tenant_slug,
    COUNT(DISTINCT u.id) as user_count,
    COUNT(DISTINCT tk.id) as ticket_count,
    COUNT(DISTINCT c.id) as customer_count
FROM tenants t
LEFT JOIN users u ON u."tenantId" = t.id
LEFT JOIN tickets tk ON tk."tenantId" = t.id
LEFT JOIN customers c ON c."tenantId" = t.id
GROUP BY t.id, t.name, t.slug;
EOF

echo ""
echo "─────────────────────────────────────────────────────────────"
echo "Usuarios por tenant:"
echo "─────────────────────────────────────────────────────────────"
echo ""

npx prisma db execute --stdin <<'EOF'
SELECT 
    t.name as tenant,
    u.email,
    u.name as user_name,
    u.role
FROM users u
JOIN tenants t ON u."tenantId" = t.id
ORDER BY t.name, u.email;
EOF

echo ""
echo "═══════════════════════════════════════════════════════════"
