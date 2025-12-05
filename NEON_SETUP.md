# Configuración de Neon Database

Esta aplicación está configurada para usar Neon como base de datos PostgreSQL en producción.

## ✅ Base de datos Neon configurada

Tu proyecto ya está conectado a Neon:
- **Database**: `neondb`
- **Region**: `us-east-1`
- **Schema**: Migrado y sincronizado

## Variables de entorno para Vercel

Agrega estas variables en tu proyecto de Vercel (Settings → Environment Variables):

### Production y Preview:

**DATABASE_URL**
```
postgresql://neondb_owner:npg_l3O0mWGqFBCY@ep-gentle-hill-adon7ba3-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**AUTH_SECRET** (genera uno nuevo)
```bash
openssl rand -base64 32
```

**AUTH_URL**
- Production: `https://tu-dominio.vercel.app`
- Preview: Deja vacío (Vercel lo manejará automáticamente)

## Seed de la base de datos (Opcional)

Si quieres poblar la base de datos con datos iniciales:

```bash
DATABASE_URL="postgresql://neondb_owner:npg_l3O0mWGqFBCY@ep-gentle-hill-adon7ba3-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" npm run db:seed
```

Esto creará:
- Un tenant por defecto: `default-workshop`
- Un usuario admin:
  - Email: `admin@example.com`
  - Password: `password123`

## Acceder a Neon Dashboard

Para gestionar tu base de datos:

1. Ve a https://console.neon.tech
2. Selecciona tu proyecto
3. Puedes ver:
   - **SQL Editor**: Ejecutar queries
   - **Tables**: Ver datos
   - **Branches**: Crear branches de base de datos
   - **Monitoring**: Ver uso y performance

## Branching de base de datos (Avanzado)

Neon permite crear branches de tu base de datos para preview environments:

```bash
# Crear un branch para development
neon branches create --name dev --parent main

# Obtener connection string del branch
neon connection-string dev
```

## Ventajas de Neon

- ✅ **Serverless**: Paga solo por lo que usas
- ✅ **Auto-scaling**: Escala automáticamente
- ✅ **Branching**: Crea branches de BD para testing
- ✅ **Gratis**: 512 MB y 3 GB de almacenamiento
- ✅ **Rápido**: Conexiones instantáneas con pooling

## Migraciones futuras

Cuando hagas cambios al schema de Prisma:

```bash
# 1. Crear migración localmente
npx prisma migrate dev --name tu_cambio

# 2. Deploy a producción (lo hace automáticamente el CI/CD)
DATABASE_URL="tu-neon-url" npx prisma migrate deploy
```

## Troubleshooting

### Error: "Connection timeout"
- Verifica que la connection string tenga `?sslmode=require`
- Revisa que la región de Neon sea accesible

### Error: "Too many connections"
- Usa la URL con pooler (la que termina en `-pooler`)
- Neon maneja automáticamente el connection pooling

### Base de datos vacía después de deploy
- Ejecuta las migraciones: `npx prisma migrate deploy`
- Opcionalmente ejecuta el seed: `npx prisma db seed`
