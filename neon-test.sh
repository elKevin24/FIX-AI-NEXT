#!/bin/bash

# Script para diagnosticar conexión a Neon

echo "═══════════════════════════════════════════════════════════"
echo "🔍 Diagnóstico de Conexión a Neon Database"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Test 1: Ping al servidor
echo "1️⃣ Testing DNS resolution..."
HOST="ep-gentle-hill-adon7ba3.c-2.us-east-1.aws.neon.tech"
if nslookup $HOST > /dev/null 2>&1; then
    echo "✅ DNS resolution OK"
else
    echo "❌ DNS resolution failed"
fi
echo ""

# Test 2: Test de conexión TCP
echo "2️⃣ Testing TCP connection to port 5432..."
if timeout 5 bash -c "cat < /dev/null > /dev/tcp/$HOST/5432" 2>/dev/null; then
    echo "✅ TCP connection OK"
else
    echo "❌ Cannot reach port 5432 (might be firewall or network issue)"
fi
echo ""

# Test 3: Intentar conexión simple con Prisma
echo "3️⃣ Testing Prisma connection..."
dotenv -e .env.neon -- npx prisma db execute --stdin <<EOF
SELECT version();
EOF

exitcode=$?
if [ $exitcode -eq 0 ]; then
    echo "✅ Prisma connection OK"
else
    echo "❌ Prisma connection failed (exit code: $exitcode)"
fi
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "💡 Posibles soluciones si falla:"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "1. Verifica en Neon Dashboard que la BD esté activa"
echo "   https://console.neon.tech"
echo ""
echo "2. La BD puede estar en 'sleep mode' - espera ~30 segundos"
echo "   y vuelve a intentar"
echo ""
echo "3. Verifica que no haya firewall bloqueando puerto 5432"
echo ""
echo "4. Usa Vercel para ejecutar migraciones automáticamente"
echo "   (git push hace deploy + migrate automático)"
echo ""
echo "═══════════════════════════════════════════════════════════"
