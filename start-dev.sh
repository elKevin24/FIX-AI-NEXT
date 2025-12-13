#!/bin/bash

# Script para iniciar Next.js dev server con Neon Database

set -e

echo "🔗 Conectando a Neon Database..."

# Verificar que existe la variable DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    if [ ! -f .env ]; then
        echo "❌ No se encontró el archivo .env"
        echo "   Crea un archivo .env con DATABASE_URL"
        exit 1
    fi
    echo "✅ Usando configuración de .env"
else
    echo "✅ DATABASE_URL configurado"
fi

echo "📦 Ejecutando migraciones de Prisma (si aplica)..."
npx prisma migrate deploy --skip-generate 2>/dev/null || {
    echo "⚠️  Migraciones fallaron (ignorando, continuando con servidor)"
}

echo "🚀 Iniciando Next.js dev server..."
npx next dev
