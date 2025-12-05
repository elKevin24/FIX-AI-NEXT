# Arquitectura del Sistema Multi-Tenant Workshop

## Visión General

Este sistema está diseñado para gestionar múltiples talleres electrónicos bajo una sola aplicación, utilizando un modelo de **multi-tenancy** con aislamiento de datos a nivel de aplicación.

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 15)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Landing     │  │   Dashboard  │  │ Public Query │      │
│  │  Page        │  │   (Auth)     │  │  (No Auth)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    MIDDLEWARE (Auth Check)                   │
│              NextAuth.js v5 + JWT Sessions                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API ROUTES (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  /api/auth   │  │ /api/tickets │  │ /api/users   │      │
│  │  (NextAuth)  │  │  (CRUD)      │  │  (CRUD)      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  Validación de tenantId en TODAS las operaciones            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    PRISMA ORM (Type-Safe)                    │
│                   Tenant Isolation Layer                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     POSTGRESQL DATABASE                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Tenants │ Users │ Tickets │ Customers │ AuditLogs  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Modelo de Multi-Tenancy

### Estrategia: Shared Database, Shared Schema

- **Una base de datos** para todos los talleres
- **Un esquema** compartido
- **Aislamiento por `tenantId`** en cada tabla

#### Ventajas
✅ Menor costo de infraestructura  
✅ Fácil mantenimiento y actualizaciones  
✅ Escalabilidad horizontal simple  
✅ Backup y restore centralizados  

#### Desventajas
⚠️ Requiere validación estricta de `tenantId`  
⚠️ Riesgo de data leakage si hay bugs  
⚠️ Límites de escalabilidad a largo plazo  

### Implementación de Aislamiento

```typescript
// ✅ CORRECTO: Todas las queries incluyen tenantId
const tickets = await prisma.ticket.findMany({
  where: {
    tenantId: session.user.tenantId,  // Aislamiento
    status: 'OPEN'
  }
});

// ❌ INCORRECTO: Sin validación de tenant
const tickets = await prisma.ticket.findMany({
  where: { status: 'OPEN' }  // ¡PELIGRO! Acceso a todos los tenants
});
```

## Flujo de Autenticación

```
1. Usuario → /login
2. Credenciales → NextAuth.js
3. Validación → Prisma → PostgreSQL
4. JWT generado con: { id, email, role, tenantId }
5. Session almacenada
6. Middleware valida en cada request
7. API Routes acceden a session.user.tenantId
```

## Control de Acceso (RBAC)

### Roles

| Rol | Permisos |
|-----|----------|
| **ADMIN** | Acceso completo al tenant. Crear/editar usuarios, tickets, configuración |
| **TECHNICIAN** | Ver y actualizar tickets asignados. Agregar repuestos |
| **RECEPTIONIST** | Crear tickets. Ver estado. No puede eliminar |

### Implementación

```typescript
// Middleware de autorización
if (session.user.role !== 'ADMIN') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## Modelo de Datos

### Relaciones Principales

```
Tenant (1) ──< (N) User
Tenant (1) ──< (N) Ticket
Tenant (1) ──< (N) Customer
Tenant (1) ──< (N) Part
Tenant (1) ──< (N) AuditLog

Ticket (N) ──> (1) Customer
Ticket (N) ──> (1) User (assignedTo)
Ticket (1) ──< (N) PartUsage
Part (1) ──< (N) PartUsage
```

### Índices Importantes

```sql
-- Optimización de queries por tenant
CREATE INDEX idx_tickets_tenant ON tickets(tenant_id);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);

-- Búsqueda de tickets
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to_id);
```

## Auditoría y Trazabilidad

Todas las operaciones críticas generan un registro en `AuditLog`:

```typescript
await prisma.auditLog.create({
  data: {
    action: 'UPDATE_TICKET',
    details: JSON.stringify({
      ticketId,
      changes: { status: 'RESOLVED' }
    }),
    userId: session.user.id,
    tenantId: session.user.tenantId,
  }
});
```

### Eventos Auditados

- ✅ Creación de tickets
- ✅ Actualización de estado
- ✅ Asignación de técnicos
- ✅ Eliminación de registros (solo ADMIN)
- ✅ Cambios en usuarios

## Escalabilidad

### Horizontal (Recomendado)

- **Serverless Functions** en Vercel
- Auto-scaling basado en demanda
- Sin gestión de servidores

### Vertical (Futuro)

Si un tenant crece mucho:
1. Migrar a su propia base de datos
2. Actualizar `DATABASE_URL` por tenant
3. Mantener la misma aplicación

### Caching

```typescript
// Implementar Redis para queries frecuentes
const cachedTickets = await redis.get(`tickets:${tenantId}`);
if (cachedTickets) return JSON.parse(cachedTickets);

// Si no está en cache, consultar DB
const tickets = await prisma.ticket.findMany({...});
await redis.set(`tickets:${tenantId}`, JSON.stringify(tickets), 'EX', 300);
```

## Seguridad

### Medidas Implementadas

1. **Autenticación**: NextAuth.js con JWT
2. **Hashing de passwords**: bcryptjs (12 rounds)
3. **Aislamiento de datos**: Validación de `tenantId` en todas las queries
4. **RBAC**: Control de acceso basado en roles
5. **HTTPS**: Obligatorio en producción
6. **Variables de entorno**: Secrets nunca en código

### Mejoras Futuras

- [ ] Rate limiting por tenant
- [ ] 2FA (Two-Factor Authentication)
- [ ] Encriptación de datos sensibles
- [ ] WAF (Web Application Firewall)
- [ ] Monitoreo de accesos sospechosos

## Monitoreo y Observabilidad

### Métricas Clave

- Requests por tenant
- Tiempo de respuesta de APIs
- Errores de autenticación
- Uso de base de datos

### Herramientas Sugeridas

- **Vercel Analytics**: Performance monitoring
- **Sentry**: Error tracking
- **Prisma Pulse**: Database events
- **LogRocket**: Session replay

## Despliegue

### Entornos

```
Development → Staging → Production
     ↓            ↓          ↓
  Local DB    Test DB    Prod DB
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
on: [push]
jobs:
  deploy:
    - npm install
    - npm run lint
    - npm run build
    - npx prisma migrate deploy
    - Deploy to Vercel
```

## Costos Estimados (Producción)

| Servicio | Plan | Costo/mes |
|----------|------|-----------|
| Vercel | Pro | $20 |
| PostgreSQL | Neon/Supabase | $25 |
| Redis (opcional) | Upstash | $10 |
| **Total** | | **~$55/mes** |

Escala con número de tenants y tráfico.

## Conclusión

Esta arquitectura proporciona:
- ✅ Aislamiento seguro de datos
- ✅ Escalabilidad automática
- ✅ Bajo costo inicial
- ✅ Fácil mantenimiento
- ✅ Auditoría completa

Ideal para startups y SMBs que necesitan gestionar múltiples clientes bajo una sola plataforma.
