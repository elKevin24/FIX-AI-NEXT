# RBAC — FIX-AI NEXT

> Basado en el código real: `src/lib/auth-utils.ts` (`ROLE_PERMISSIONS`, helpers), `src/types/next-auth.d.ts`, `prisma/schema.prisma` (enum `UserRole`), `src/lib/authz.ts`.

## Roles reales (no hay `RECEPTIONIST` ni `AGENT`)

| Rol | Nivel jerárquico | Descripción |
|-----|:---:|-------------|
| `SUPER_ADMIN` | 5 | Plataforma global (fuera de un tenant normal). Singular/monitoreado. |
| `ADMIN` | 4 | Control total del tenant. |
| `MANAGER` | 3 | Gestiona tickets y usuarios; **no** cambia configuración del tenant ni elimina tickets/usuarios. |
| `TECHNICIAN` | 2 | Crea y atiende los tickets que le tocan. |
| `VIEWER` | 1 | Solo lectura. |

> `getRoleHierarchyLevel` en `auth-utils.ts` define esta jerarquía (SUPER_ADMIN=5 … VIEWER=1). El "recepcionista" del seed usa el rol **VIEWER** (`recepcion@electrofix.com`).

## Modelo: Rol → Permisos → Acción

- Existe una **matriz booleana `ROLE_PERMISSIONS`** en `src/lib/auth-utils.ts` que asigna, por rol, un mapa de permisos como:
  - `canCreateUsers`, `canDeleteUsers`, `canEditUsers`, `canChangeRoles`, `canDeactivateUsers`
  - `canManageTenantSettings`
  - `canViewAllTickets`, `canTakeTicket`, `canAssignTickets`, `canStartTicket`, `canResolveTicket`, `canDeliverTicket`, `canCancelTickets`, `canReopenTickets`, `canWaitForParts`, `canResumeFromWaiting`, `canDeleteTickets`
  - `canEditParts`, `canDeleteParts`, `canAddPartsToTicket`
  - `canCreateCustomers`, `canEditCustomers`, `canDeleteCustomers`
  - `canViewReports`, `canManageTemplates`, `canExportData`
- **`Permission`** es `keyof typeof ROLE_PERMISSIONS.ADMIN`.
- **`TICKET_ACTION_PERMISSIONS`** mapea acciones de ticket → permiso requerido.

### Resumen por rol

| Permiso / Capacidad | SUPER_ADMIN | ADMIN | MANAGER | TECHNICIAN | VIEWER |
|---|---|---|---|---|---|
| Gestión de usuarios | ✅ | ✅ | parcial | ❌ | ❌ |
| Configuración del tenant | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver todos los tickets | ✅ | ✅ | ✅ | ❌ | ✅ |
| Tomar/iniciar/resolver | ✅ | ✅ | ✅ | ✅ | ❌ |
| Asignar/entregar/cancelar/reabrir/borrar tickets | ✅ | ✅ | depende | ❌ | ❌ |
| Editar/borrar partes | ✅ | ✅ | ✅ | ❌ | ❌ |
| Añadir partes al ticket | ✅ | ✅ | ✅ | ✅ | ❌ |
| Ver reportes | ✅ | ✅ | ✅ | ❌ | ✅ |
| Exportar datos | ✅ | ✅ | ✅ | ❌ | ❌ |

> Consulta `ROLE_PERMISSIONS` directamente en el código para el detalle exacto por rol.

## Guard helpers (dónde se valida)

`src/lib/auth-utils.ts`:
- `hasPermission(role, permission)` — chequeo básico.
- `requirePermission(...)` — lanza `AuthorizationError` si no tiene el permiso.
- `requireAdminOrManager(...)`, `requireAdmin(...)`, `requireTenant...`.
- `validateTenantAccess(requesterTenantId, targetTenantId, role)` — **verifica que el usuario opera dentro de su tenant** (y permite cruce solo para SUPER_ADMIN).
- `canModifyUser(actor, targetUser, role)` — reglas para editar usuarios.
- `requireTicketActionPermission(...)` — valida que el rol pueda ejecutar la acción de ticket.

Helpers de sesión a nivel server: `src/lib/auth-context.ts` → `assertNotViewer`, `assertAdmin`.
`isSuperAdmin(user)` en `src/lib/authz.ts` (rol `SUPER_ADMIN` o email en `SUPERADMIN_EMAILS`).

## Dónde se validan de verdad

- **Server Actions**: cada action autentica y autoriza antes de mutar (ej. `user-actions.ts` usa guards; las actions de customer/part validan permisos).
- **Route Handlers**: algunas rutas CRUD legacy validan autenticación/tenant, pero **no todas aplican RBAC por rol** (deuda conocida, ver `docs/security/security-guidelines.md`).

## ⚠️ Regla de oro

> **La seguridad nunca depende de ocultar botones en el frontend.** El frontend reduce fricción, pero la autorización real se valida **en el servidor** (Server Action / Route Handler). Revisa cada nueva acción para asegurar que aplica `requirePermission`/`validateTenantAccess` con datos de `session`, no de props del cliente.
