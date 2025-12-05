# 🐘 Neon Database - Troubleshooting Guide

## ⚠️ Problema Común: Timeout en Conexión

### Síntoma
```
Error: P1002
The database server timed out
Context: Timed out trying to acquire a postgres advisory lock
```

---

## 🔧 Soluciones

### ✅ Solución 1: Dejar que Vercel Maneje las Migraciones (RECOMENDADO)

**La forma más simple y confiable:**

```bash
# 1. Haz commit de tus migraciones
git add prisma/migrations
git commit -m "feat: nueva migración"
git push

# 2. Vercel automáticamente:
#    - Detecta las nuevas migraciones
#    - Las ejecuta en Neon
#    - Despliega la app
```

**Beneficios:**
- ✅ Sin problemas de timeout
- ✅ Sin configurar nada
- ✅ Migraciones ejecutadas en el mismo entorno de producción
- ✅ Logs visibles en Vercel Dashboard

---

### ✅ Solución 2: Usar Conexión Directa (Non-Pooled)

Neon tiene dos tipos de conexión:

**❌ Pooled Connection** (para queries normales):
```
postgresql://...@ep-gentle-hill-adon7ba3-pooler.c-2.us-east-1.aws.neon.tech/...
```
⚠️ NO funciona para migraciones (advisory locks)

**✅ Direct Connection** (para migraciones):
```
postgresql://...@ep-gentle-hill-adon7ba3.c-2.us-east-1.aws.neon.tech/...
```
Note: Sin `-pooler` en el hostname

El archivo `.env.neon` ya está configurado con la conexión directa.

---

### ✅ Solución 3: Esperar que Neon "Despierte"

Neon escala a cero cuando no hay actividad. El primer request puede tardar.

```bash
# 1. Espera 30 segundos y vuelve a intentar
npm run neon:migrate

# 2. O primero "despierta" la BD:
dotenv -e .env.neon -- npx prisma db execute --stdin <<< "SELECT 1;"

# 3. Luego ejecuta la migración:
npm run neon:migrate
```

---

### ✅ Solución 4: Usar `db push` en lugar de `migrate`

Para desarrollo/staging, usar `db push` es más simple:

```bash
# Sincroniza el schema sin crear archivos de migración
dotenv -e .env.neon -- npx prisma db push
```

**Diferencias:**
- `migrate deploy`: Para producción, usa archivos de migración
- `db push`: Para dev/testing, sincroniza el schema directamente

---

## 🌐 Verificar Estado de Neon

### Panel de Control
1. Ve a: https://console.neon.tech
2. Selecciona tu proyecto: `hidden-night-03961707`
3. Verifica:
   - ✅ Database está activa (no suspendida)
   - ✅ No hay problemas de facturación
   - ✅ Límites de uso no excedidos

### Connection Pooler
- Neon usa **PgBouncer** como connection pooler
- Algunas operaciones requieren conexión directa
- Migraciones SIEMPRE necesitan conexión directa

---

## 🔍 Diagnóstico

Ejecuta el script de diagnóstico:

```bash
./neon-test.sh
```

Verificará:
1. DNS resolution
2. Conectividad TCP al puerto 5432
3. Conexión con Prisma

---

## 🚀 Workflow Recomendado

### Para Desarrollo
```bash
# Usa tu BD local
npm run db:migrate
npm run db:seed
npm run dev
```

### Para Deploy a Producción
```bash
# Opción A: Automático (RECOMENDADO)
git add .
git commit -m "feat: cambios"
git push
# Vercel ejecuta migraciones automáticamente

# Opción B: Manual desde local
npm run neon:migrate  # Solo si es necesario
```

### Para Sembrar Datos en Neon
```bash
# ⚠️ CUIDADO: Esto agrega datos de prueba a producción
npm run neon:seed

# Mejor: Crea un script específico para producción
# que NO incluya datos de testing
```

---

## 📋 Checklist de Problemas

Si `npm run neon:migrate` falla:

- [ ] ¿Estás usando la conexión directa? (verifica `.env.neon`)
- [ ] ¿La base de datos está activa en Neon Console?
- [ ] ¿Tienes conexión a internet?
- [ ] ¿El firewall bloquea puerto 5432?
- [ ] ¿Probaste esperar 30 segundos y reintentar?
- [ ] ¿Consideraste usar Vercel para migrar en su lugar?

---

## 🎯 Mejor Práctica

**Para proyectos en producción:**

1. **Local**: Usa PostgreSQL Docker
2. **Desarrollo del Schema**: 
   ```bash
   npm run db:migrate  # Crea migración local
   git add prisma/migrations
   git commit -m "feat: nueva migración"
   ```
3. **Deploy**: 
   ```bash
   git push  # Vercel ejecuta migraciones automáticamente
   ```
4. **Verificación**:
   - Ve a Vercel Dashboard → Deployments
   - Revisa los logs del build
   - Busca: "Running prisma generate" / "Running migrations"

---

## 🆘 Si Todo Falla

1. **Accede a Neon via Vercel**:
   ```bash
   vercel env pull .env.production
   dotenv -e .env.production -- npx prisma studio
   ```

2. **O ejecuta migraciones via Vercel CLI**:
   ```bash
   vercel env pull .env.production
   vercel exec -- npx prisma migrate deploy
   ```

3. **Contacta Soporte de Neon**:
   - https://neon.tech/docs/introduction/support
   - Incluye el error exacto y tu project ID

---

## 📚 Referencias

- [Neon Connection Pooling](https://neon.tech/docs/connect/connection-pooling)
- [Prisma with Neon](https://neon.tech/docs/guides/prisma)
- [Vercel + Neon Integration](https://vercel.com/integrations/neon)
- [Advisory Locks en PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS)
