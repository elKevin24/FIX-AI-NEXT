# 📘 Runbook: Investigación y Mitigación de Fuga de Datos Multi-Tenant

## Severidad: P1 — Crítico
**Objetivo:** Contener el acceso no autorizado entre inquilinos y auditar el impacto en menos de 30 minutos.

---

### Paso 1: Contención Inmediata
1. Identificar el Tenant ID víctima y el Tenant ID agresor involucrado.
2. Si el incidente proviene de un usuario específico, desactivar su cuenta inmediatamente:
   ```sql
   UPDATE users SET "isActive" = false WHERE id = '<userId>';
   ```
3. Si el incidente proviene de un bug en un Server Action o API route, revocar el despliegue a la versión previa estable en Vercel.

---

### Paso 2: Análisis Forense de Auditoría
1. Consultar todos los eventos registrados en `AuditLog` para ese tenant:
   ```sql
   SELECT "createdAt", "action", "module", "userId", "ipAddress", "metadata"
   FROM "audit_logs"
   WHERE "tenantId" = '<victimTenantId>'
     AND "createdAt" >= NOW() - INTERVAL '24 hours'
   ORDER BY "createdAt" DESC;
   ```
2. Analizar registros de sesiones activas en `SessionLog`:
   ```sql
   SELECT "userId", "sessionToken", "ipAddress", "lastActivityAt", "status"
   FROM "session_logs"
   WHERE "tenantId" = '<victimTenantId>' AND "status" = 'ACTIVE';
   ```

---

### Paso 3: Erradicación y Parcheo
1. Localizar la consulta que originó la fuga.
2. Verificar que utilice `getTenantPrisma(tenantId, userId)` y **NUNCA** `prisma.*.find...` directo.
3. Asegurar que las consultas sobre entidades hijas (`PartUsage`, `TicketAttachment`, `CreditNoteItem`) filtren por el `tenantId` del padre.
4. Escribir un test unitario de regresión en Vitest para validar que ningún otro tenant pueda consultar ese registro.
