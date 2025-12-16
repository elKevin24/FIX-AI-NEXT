# 🗄️ Guía de Gestión de Bases de Datos

Este proyecto soporta **dos entornos de base de datos**:
1. **PostgreSQL Local** (para desarrollo)
2. **Neon Cloud Database** (para producción/staging en Vercel)

---

## 📋 Tabla de Contenidos
- [Archivos de Configuración](#archivos-de-configuración)
- [Base de Datos Local](#base-de-datos-local)
- [Base de Datos Neon](#base-de-datos-neon)
- [Scripts Disponibles](#scripts-disponibles)
- [Flujo de Trabajo Recomendado](#flujo-de-trabajo-recomendado)

---

## 📁 Archivos de Configuración

### `.env` (Base de datos LOCAL)
```bash
DATABASE_URL="postgresql://workshop_user:workshop_pass@localhost:5432/workshop_db?schema=public"
AUTH_SECRET="insecure-fallback-secret-for-development"
AUTH_URL="http://localhost:3000"
```
✅ **Este es tu archivo por defecto para desarrollo local**

### `.env.neon` (Base de datos NEON)
```bash
DATABASE_URL="postgresql://neondb_owner:npg_...@ep-gentle-hill-adon7ba3-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
```
🔐 **Usa este archivo cuando quieras trabajar con Neon localmente**

### `.env.local` (Generado por Vercel CLI)
❌ **NO EDITAR MANUALMENTE** - Este archivo es generado automáticamente por Vercel

### `.env.example` (Plantilla)
📄 Template de ejemplo para compartir con el equipo (sin credenciales reales)

---

## 💻 Base de Datos Local

### 1. Iniciar PostgreSQL (Docker)
```bash
npm run db:start
```

### 2. Ejecutar Migraciones
```bash
npm run db:migrate
```

### 3. Sembrar Datos de Prueba
```bash
npm run db:seed
```

### 4. Abrir Prisma Studio (GUI)
```bash
npm run db:studio
```
Visita: http://localhost:5555

### 5. Resetear Base de Datos
```bash
npm run db:reset
npm run db:migrate
npm run db:seed
```

---

## ☁️ Base de Datos Neon

### 1. Aplicar Migraciones a Neon
```bash
npm run neon:migrate
```
⚠️ **Nota**: Usa `migrate deploy` para producción (no `migrate dev`)

### 2. Sembrar Datos en Neon
```bash
npm run neon:seed
```
⚠️ **CUIDADO**: Esto agregará datos de prueba a tu base de datos en la nube

### 3. Ver Datos de Neon con Prisma Studio
```bash
npm run neon:studio
```
Visita: http://localhost:5555

### 4. Ejecutar Cualquier Comando con Neon
```bash
dotenv -e .env.neon -- npx prisma [comando]
```

Ejemplos:
```bash
dotenv -e .env.neon -- npx prisma db push
dotenv -e .env.neon -- npx prisma generate
```

---

## 🔧 Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo |
| **Base de Datos Local** | |
| `npm run db:start` | Inicia PostgreSQL (Docker) |
| `npm run db:stop` | Detiene PostgreSQL |
| `npm run db:reset` | Resetea completamente la BD local |
| `npm run db:migrate` | Ejecuta migraciones (local) |
| `npm run db:seed` | Siembra datos de prueba (local) |
| `npm run db:studio` | Abre Prisma Studio (local) |
| **Base de Datos Neon** | |
| `npm run neon:migrate` | Aplica migraciones a Neon |
| `npm run neon:seed` | Siembra datos en Neon |
| `npm run neon:studio` | Abre Prisma Studio conectado a Neon |

---

## 🔄 Flujo de Trabajo Recomendado

### Desarrollo Diario (Local)
```bash
# 1. Asegúrate de que .env apunte a PostgreSQL local
cat .env | grep DATABASE_URL

# 2. Inicia la base de datos local
npm run db:start

# 3. Inicia el servidor de desarrollo
npm run dev
```

### Crear Nueva Migración
```bash
# 1. Modifica schema.prisma
# 2. Crea y aplica la migración localmente
npm run db:migrate
# 3. Verifica con Prisma Studio
npm run db:studio
# 4. Commitea el archivo de migración a Git
git add prisma/migrations
git commit -m "feat: add new migration"
```

### Deploy a Producción
```bash
# 1. Haz push a Git
git push origin main

# 2. Vercel automáticamente:
#    - Ejecutará las migraciones en Neon
#    - Desplegará la aplicación

# 3. (Opcional) Sembrar datos manualmente en Neon
npm run neon:seed
```

### Testing con Neon Localmente
```bash
# Si quieres probar contra Neon desde tu máquina local:

# 1. Ejecuta comandos con .env.neon
npm run neon:studio

# 2. O temporalmente cambia DATABASE_URL en .env
# (No olvides restaurarlo después)
```

---

## ⚠️ Advertencias Importantes

### 🔴 NO Commitees estos archivos:
- `.env`
- `.env.local`
- `.env.neon`

Estos ya están en `.gitignore`

### 🟡 SÍ Commitea estos archivos:
- `.env.example`
- `prisma/schema.prisma`
- `prisma/migrations/*`
- `prisma/seed.ts`

### 🔐 Secrets y Credenciales
- Las credenciales de Neon están en **Vercel Dashboard** → Proyecto → Settings → Environment Variables
- Localmente, Vercel CLI sincroniza las credenciales a `.env.local`
- NUNCA compartas credenciales en código o commits

---

## 🆘 Troubleshooting

### "Can't reach database server"
```bash
# Verifica que Docker esté corriendo
docker ps

# Reinicia la base de datos
npm run db:reset
```

### "Migration already exists"
```bash
# Si tienes conflictos, reset local
npm run db:reset
npx prisma migrate dev
```

### "Environment variable not found: DATABASE_URL"
```bash
# Verifica que .env existe y tiene DATABASE_URL
cat .env

# Si no existe, cópiate de .env.example
cp .env.example .env
```

---

## 📊 Estado Actual

### Datos de Prueba Disponibles

Después de ejecutar `npm run db:seed`:

**Usuarios** (password: `password123`):
- `admin@electrofix.com` - Admin (Carlos Rodriguez)
- `tech1@electrofix.com` - Técnico (Miguel Torres)
- `tech2@electrofix.com` - Técnico (Ana Martinez)
- `recep@electrofix.com` - Recepcionista (Laura Gomez)

**Datos**:
- 4 Clientes
- 5 Tickets (con diferentes estados)
- 5 Tipos de Partes/Repuestos
- Registros de uso de partes
- Audit logs

---

## 🔗 Referencias

- [Prisma Docs](https://www.prisma.io/docs)
- [Neon Database](https://neon.tech/docs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [PostgreSQL Docker](https://hub.docker.com/_/postgres)
