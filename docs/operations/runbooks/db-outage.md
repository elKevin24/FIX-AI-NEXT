# 📘 Runbook: Caída o Indisponibilidad de Base de Datos (Neon PostgreSQL)

## Severidad: P1 — Crítico
**Objetivo:** Restaurar el acceso a los datos y normalizar el tráfico de FIX-AI NEXT en menos de 15 minutos.

---

### Paso 1: Diagnóstico y Confirmación
1. Consultar el estado del endpoint de salud:
   ```bash
   curl -I https://fix-ai-next.vercel.app/api/health
   ```
2. Verificar el panel de estado oficial de Neon: `https://status.neon.tech/`.
3. Revisar los logs en Vercel Dashboard (`Logs -> Filter: [HealthCheck] Database check failed`).

---

### Paso 2: Escenarios de Resolución

#### Escenario A: Expuisición / Agotamiento de Conexiones
1. En Neon Console, verificar las conexiones activas en el connection pooler (`pgbouncer`).
2. Comprobar que `DATABASE_URL` apunte a la URL con `-pooler` en el subdominio de Neon.
3. Si un proceso zombie está bloqueando tablas, ejecutar desde Neon SQL Editor:
   ```sql
   SELECT pid, query, state, age(clock_timestamp(), query_start) 
   FROM pg_stat_activity 
   WHERE state != 'idle' AND age(clock_timestamp(), query_start) > interval '2 minutes';
   
   -- Para terminar la query bloqueante:
   SELECT pg_terminate_backend(<pid>);
   ```

#### Escenario B: Compute Node Suspendido o Falla de Región
1. Desde la CLI de Neon:
   ```bash
   neon endpoint restart <endpoint-id>
   ```
2. Si el compute no responde, crear un branch instantáneo desde el último snapshot (Point-in-Time):
   ```bash
   neon branches create --name recovery-branch --from-timestamp "2026-09-01T04:00:00Z"
   ```
3. Obtener la nueva `DATABASE_URL` del branch y actualizar en Vercel:
   ```bash
   vercel env add DATABASE_URL production
   vercel redeploy --prod
   ```

---

### Paso 3: Verificación Post-Recuperación
1. Confirmar respuesta exitosa:
   ```bash
   curl https://fix-ai-next.vercel.app/api/health
   # Debe responder {"status":"healthy","checks":{"database":"up"}}
   ```
2. Probar login en `/login` y navegación en `/dashboard/tickets`.
