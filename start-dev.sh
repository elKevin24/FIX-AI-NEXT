#!/bin/bash

# Script para iniciar Docker + Next.js dev server

set -e

echo "🐳 Iniciando Docker daemon..."
if ! command -v systemctl &> /dev/null; then
    echo "⚠️  systemctl no disponible. Intenta iniciar Docker manualmente:"
    echo "   sudo dockerd &"
    exit 1
fi

# Verificar si Docker está corriendo
if ! docker ps &> /dev/null; then
    echo "🔄 Docker no está corriendo. Iniciando..."
    systemctl start docker 2>/dev/null || {
        echo "⚠️  No se pudo iniciar Docker con systemctl"
        echo "   Intenta: sudo systemctl start docker"
        exit 1
    }
    sleep 2
fi

echo "✅ Docker está activo"

echo "🐘 Iniciando PostgreSQL con docker compose..."
docker compose up -d || true # Ignorar errores (warnings) y continuar
docker compose ps -q db > /dev/null || {
    echo "❌ El contenedor de la base de datos no está corriendo. Verifica Docker Compose."
    exit 1
}

echo "⏳ Esperando a PostgreSQL (5 segundos)..."
sleep 5

echo "📦 Ejecutando migraciones de Prisma (si aplica)..."
npx prisma migrate deploy --skip-generate 2>/dev/null || {
    echo "⚠️  Migraciones fallaron (ignorando, continuando con servidor)"
}

echo "🚀 Iniciando Next.js dev server..."
npx next dev
