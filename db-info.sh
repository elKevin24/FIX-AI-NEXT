#!/bin/bash

# 🎨 Script de Ayuda - Gestión de Bases de Datos
# Este script te muestra qué base de datos estás usando actualmente

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🗄️  CONFIGURACIÓN DE BASE DE DATOS"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Verificar archivo .env
if [ -f .env ]; then
    echo "📁 Archivo .env encontrado"
    echo ""
    
    # Extraer DATABASE_URL
    DB_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2- | tr -d '"')
    
    if [[ $DB_URL == *"localhost"* ]]; then
        echo "✅ MODO: Desarrollo Local (PostgreSQL Docker)"
        echo "🔗 Conexión: localhost:5432"
        echo "📦 Base de datos: workshop_db"
        echo ""
        echo "Comandos útiles:"
        echo "  npm run db:start   - Iniciar PostgreSQL"
        echo "  npm run db:seed    - Sembrar datos"
        echo "  npm run db:studio  - Abrir Prisma Studio"
    elif [[ $DB_URL == *"neon.tech"* ]]; then
        echo "☁️  MODO: Neon Cloud Database"
        echo "⚠️  ADVERTENCIA: Estás conectado a la base de datos en la nube"
        echo ""
        echo "Para volver a desarrollo local:"
        echo "  cp .env.example .env"
        echo "  # Luego edita .env con tus credenciales locales"
    else
        echo "⚠️  Base de datos no reconocida"
        echo "DATABASE_URL: $DB_URL"
    fi
else
    echo "❌ Archivo .env no encontrado"
    echo ""
    echo "Para configurar:"
    echo "  cp .env.example .env"
    echo "  # Luego edita .env con tus credenciales"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📚 Archivos de configuración disponibles:"
echo "═══════════════════════════════════════════════════════════"

if [ -f .env ]; then
    echo "✅ .env          - En uso (ver arriba)"
fi

if [ -f .env.local ]; then
    echo "✅ .env.local    - Generado por Vercel CLI"
fi

if [ -f .env.neon ]; then
    echo "✅ .env.neon     - Para conectar a Neon localmente"
fi

if [ -f .env.example ]; then
    echo "✅ .env.example  - Plantilla de configuración"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🚀 Comandos rápidos:"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Base de Datos Local:"
echo "  npm run db:start      - Iniciar PostgreSQL (Docker)"
echo "  npm run db:migrate    - Ejecutar migraciones"
echo "  npm run db:seed       - Sembrar datos de prueba"
echo "  npm run db:studio     - Abrir Prisma Studio"
echo ""
echo "Base de Datos Neon:"
echo "  npm run neon:migrate  - Aplicar migraciones a Neon"
echo "  npm run neon:seed     - Sembrar datos en Neon"
echo "  npm run neon:studio   - Ver datos de Neon"
echo ""
echo "Desarrollo:"
echo "  npm run dev           - Iniciar servidor de desarrollo"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
