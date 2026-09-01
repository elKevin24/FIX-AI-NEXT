# 📘 Runbook: Rotación Inmediata de Secretos y Llaves Comprometidas

## Severidad: P1 — Crítico
**Objetivo:** Revocar credenciales comprometidas e invalidar sesiones activas en menos de 10 minutos.

---

### 1. Rotación de `AUTH_SECRET` (NextAuth JWT Key)
1. Generar una nueva clave criptográfica segura:
   ```bash
   npx auth secret
   # O alternativamente:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Actualizar la variable en Vercel:
   ```bash
   vercel env rm AUTH_SECRET production -y
   vercel env add AUTH_SECRET production
   # Ingresar el nuevo valor generado
   ```
3. Re-desplegar inmediatamente para invalidar todos los JWTs previos:
   ```bash
   vercel redeploy --prod
   ```
4. **Efecto:** Todos los usuarios serán forzados a iniciar sesión nuevamente.

---

### 2. Rotación de `DATABASE_URL` (Neon PostgreSQL)
1. Ingresar a Neon Console -> Project -> Settings -> Roles.
2. Seleccionar el rol `neondb_owner` y hacer clic en **Reset Password**.
3. Copiar la nueva cadena de conexión generada.
4. Actualizar `DATABASE_URL` y `DIRECT_DATABASE_URL` en Vercel Dashboard.
5. Ejecutar re-despliegue en producción.

---

### 3. Rotación de `CRON_SECRET` y Upstash Redis
1. Generar nuevo token:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
2. Actualizar `CRON_SECRET` en Vercel y en la configuración de cron externa (Vercel Cron / GitHub Actions).
3. Para Upstash Redis, rotar el REST Token en la consola de Upstash (`https://console.upstash.com/`) y actualizar `UPSTASH_REDIS_REST_TOKEN`.
