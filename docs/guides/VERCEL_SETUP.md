# Configuración de Vercel

Esta guía te ayudará a configurar el deploy automático a Vercel.

## Paso 1: Crear proyecto en Vercel

1. Ve a [Vercel](https://vercel.com) e inicia sesión
2. Click en "Add New Project"
3. Importa tu repositorio `FIX-AI-NEXT` desde GitHub
4. **NO** hagas deploy todavía, solo importa el proyecto

## Paso 2: Obtener credenciales de Vercel

### Obtener VERCEL_TOKEN
1. Ve a https://vercel.com/account/tokens
2. Click en "Create Token"
3. Dale un nombre (ej: "GitHub Actions")
4. Copia el token generado

### Obtener VERCEL_ORG_ID y VERCEL_PROJECT_ID
1. En tu terminal local, ejecuta:
   ```bash
   npm install --global vercel
   vercel login
   vercel link
   ```
2. Esto creará un archivo `.vercel/project.json`
3. Lee ese archivo para obtener los IDs:
   ```bash
   cat .vercel/project.json
   ```

## Paso 3: Configurar secrets en GitHub

1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Click en "New repository secret"
4. Agrega estos tres secrets:

   - **VERCEL_TOKEN**: El token que obtuviste en el paso 2
   - **VERCEL_ORG_ID**: Del archivo `.vercel/project.json`
   - **VERCEL_PROJECT_ID**: Del archivo `.vercel/project.json`

## Paso 4: Configurar variables de entorno en Vercel

1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Agrega las siguientes variables:

### Para Production y Preview:

**DATABASE_URL**
```
postgresql://usuario:password@host:5432/database?schema=public
```
- Para producción, usa una base de datos PostgreSQL en la nube
- Recomendaciones: [Neon](https://neon.tech), [Supabase](https://supabase.com), o [Railway](https://railway.app)

**NEXTAUTH_SECRET**
```bash
# Genera uno con:
openssl rand -base64 32
```

**NEXTAUTH_URL**
- Production: `https://tu-dominio.vercel.app`
- Preview: Déjalo vacío o usa `https://${VERCEL_URL}` (Vercel lo manejará automáticamente)

## Paso 5: Base de datos para producción

Necesitas una base de datos PostgreSQL accesible desde internet. Opciones recomendadas:

### Opción 1: Neon (Recomendado - Gratis)
1. Ve a https://neon.tech
2. Crea una cuenta y un proyecto
3. Copia la connection string
4. Pégala como `DATABASE_URL` en Vercel

### Opción 2: Supabase (Gratis)
1. Ve a https://supabase.com
2. Crea un proyecto
3. Copia la connection string de PostgreSQL
4. Pégala como `DATABASE_URL` en Vercel

### Opción 3: Railway
1. Ve a https://railway.app
2. Crea un proyecto con PostgreSQL
3. Copia la connection string
4. Pégala como `DATABASE_URL` en Vercel

## Paso 6: Ejecutar migraciones

Después del primer deploy, ejecuta las migraciones:

```bash
# Conéctate a tu base de datos de producción
DATABASE_URL="tu-url-de-produccion" npx prisma migrate deploy
DATABASE_URL="tu-url-de-produccion" npx prisma db seed
```

## Deploy automático

Una vez configurado:
- ✅ Cada push a `master` hace deploy a **Production**
- ✅ Cada Pull Request crea un deploy de **Preview**
- ✅ GitHub Actions ejecuta el deploy automáticamente
- ✅ Los PRs reciben un comentario con la URL del preview

## Verificación

Después de configurar todo, haz un push y verifica:
1. GitHub Actions ejecuta el workflow "Vercel Deploy"
2. El deploy aparece en tu Vercel Dashboard
3. La aplicación está disponible en tu dominio de Vercel

## Troubleshooting

### Error: "Missing Environment Variables"
- Verifica que todas las variables estén configuradas en Vercel
- Asegúrate de que estén disponibles para Production y Preview

### Error: "Database connection failed"
- Verifica que la `DATABASE_URL` sea accesible desde internet
- Confirma que las migraciones se hayan ejecutado

### Error: "NEXTAUTH_SECRET is not defined"
- Genera un nuevo secret con `openssl rand -base64 32`
- Agrégalo en Vercel Environment Variables
