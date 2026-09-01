# 🚨 Manual de Respuesta a Incidentes de Seguridad y Operaciones

## 1. Niveles de Severidad y Tiempos de Respuesta

| Nivel | Definición | RTO / Objetivo de Respuesta | Canales de Notificación |
| :--- | :--- | :--- | :--- |
| **P1 — Crítico** | Caída total de producción, fallo de aislamiento multi-tenant, fuga comprobada de secretos, corrupción de base de datos. | **< 15 minutos** | PagerDuty / Canal SMS / Telegram Ops |
| **P2 — Alto** | Degradación severa (tasa de error 5xx > 5%), fallo de Redis/Rate Limiter, fallo de subida de archivos o bloqueo de login. | **< 1 hora** | Slack `#alerts-security` |
| **P3 — Medio** | Fallo en envío de correos asíncronos (SMTP), lentitud en reportes analíticos, bug en exportación no crítico. | **< 4 horas** | Slack `#ops-maintenance` |
| **P4 — Bajo** | Alertas menores de escaneo estático, inconsistencia visual o warning no bloqueante. | **< 24 horas** | Jira / GitHub Issues |

---

## 2. Flujo de Respuesta a Incidentes (Lifecycle)

```text
1. DETECCIÓN ──► 2. TRIAGE & SEVERIDAD ──► 3. CONTENCIÓN ──► 4. ERRADICACIÓN ──► 5. RECUPERACIÓN ──► 6. POST-MORTEM
   (Alertas /        (Clasificar P1-P4)       (Aislar IP /         (Parchear bug /      (Verificar /          (Documentar /
    Usuarios)                                  Revocar token)       Restaurar DB)        Reabrir tráfico)      Lecciones)
```

---

## 3. Protocolos Inmediatos por Tipo de Incidente

### A. Fallo de Aislamiento Multi-Tenant (Fuga de Datos entre Talleres)
1. **Contención Inmediata:** Desactivar temporalmente la ruta afectada o activar modo mantenimiento en Vercel Edge.
2. **Identificación:** Obtener los logs de auditoría mediante `getAuditLogs(tenantId)`.
3. **Erradicación:** Revisar si la consulta en cuestión bypaseó `getTenantPrisma`.
4. **Verificación:** Ejecutar suite de pruebas de aislamiento con Vitest.

### B. Fuga de Secreto / API Key Comprometida
1. **Revocación:** Revocar inmediatamente la credencial en el proveedor (Neon, Upstash, Vercel Blob, SMTP).
2. **Rotación:** Generar nuevo valor seguro y actualizar las variables en Vercel Dashboard (`Settings -> Environment Variables`).
3. **Re-despliegue:** Ejecutar `vercel --prod` o redeply en Vercel Console.
4. **Auditoría:** Consultar `SessionLog` y `AuditLog` para identificar si hubo accesos no autorizados usando la clave filtrada.

### C. Caída de Base de Datos (Neon PostgreSQL)
1. **Diagnóstico:** Consultar endpoint `/api/health` y el estado de la consola de Neon.
2. **Failover:** Si el compute principal falló, crear un branch instantáneo desde el último timestamp (`Point-in-Time Recovery`) o activar el endpoint secundario.
3. **Verificación:** Probar que `/api/health` retorne `status: "healthy"`.

---

## 4. Plantilla de Post-Mortem (Documento Post-Incidente)

Todo incidente P1/P2 debe generar un reporte en `docs/operations/post-mortems/YYYY-MM-DD-<slug>.md` con:
1. **Resumen Ejecutivo:** Qué ocurrió, duración del impacto y usuarios afectados.
2. **Línea de Tiempo Detallada:** Horas exactas (UTC) desde la detección hasta la resolución.
3. **Causa Raíz (Root Cause Analysis - 5 Whys):** Por qué ocurrió el fallo técnico.
4. **Acciones Correctivas y Preventivas:** Tareas técnicas con responsable y fecha límite para prevenir recurrencia.
