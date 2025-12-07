#!/bin/bash

# Cargar variables de Neon
if [ -f .env.neon ]; then
    export $(cat .env.neon | grep -v '#' | awk '/=/ {print $1}')
fi

# Variables Locales
LOCAL_DB_URL="postgresql://workshop_user:workshop_pass@localhost:5432/workshop_db"

# Variables Neon (Usamos la URL directa POOLED para restore es mejor, pero para schema es directa)
# Usaremos la directa para evitar problemas de locks durante el restore
NEON_DB_URL="${DATABASE_URL}"

echo "🚀 Iniciando migración completa: LOCAL -> NEON"
echo "--------------------------------------------"

# 1. Verificar herramientas
if ! command -v pg_dump &> /dev/null; then
    echo "❌ Error: pg_dump no está instalado."
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql no está instalado."
    exit 1
fi

# 2. Crear Dump Local (Solo datos, ya que el schema lo maneja Prisma, pero mejor todo para asegurar)
echo "📦 Creando backup de la base de datos local..."
pg_dump "$LOCAL_DB_URL" --no-owner --no-acl --clean --if-exists > local_dump.sql

if [ $? -eq 0 ]; then
    echo "✅ Dump creado exitosamente: local_dump.sql"
else
    echo "❌ Error al crear el dump."
    exit 1
fi

# 3. Restaurar en Neon
echo "☁️  Subiendo datos a Neon..."
echo "   (Esto puede tardar dependiendo de tu conexión)"

# Usamos psql para restaurar
psql "$NEON_DB_URL" < local_dump.sql

if [ $? -eq 0 ]; then
    echo "--------------------------------------------"
    echo "✅ ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!"
    echo "   Todos los datos locales ahora están en Neon."
    echo "--------------------------------------------"
    rm local_dump.sql
else
    echo "❌ Error al restaurar en Neon."
    # No borramos el dump por si acaso se quiere intentar manual
fi
