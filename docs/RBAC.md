# Sistema de Roles y Permisos (RBAC)

Este documento describe el sistema de control de acceso basado en roles implementado en la aplicación.

## Roles Disponibles

### ADMIN (Administrador)
**Nivel de jerarquía: 4 (máximo)**

Control total del tenant. Puede realizar todas las operaciones del sistema.

| Categoría | Permisos |
|-----------|----------|
| **Usuarios** | Crear, editar, eliminar, cambiar roles, desactivar |
| **Configuración** | Gestionar configuración del tenant |
| **Tickets** | Ver todos, tomar, asignar, iniciar, resolver, entregar, cancelar, reabrir, eliminar |
| **Inventario** | Editar partes, eliminar partes, agregar partes a tickets |
| **Clientes** | Crear, editar, eliminar |
| **Avanzado** | Ver reportes, gestionar plantillas, exportar datos |

### MANAGER (Gerente)
**Nivel de jerarquía: 3**

Gestiona tickets y usuarios, pero no puede modificar la configuración del tenant.

| Categoría | Permisos |
|-----------|----------|
| **Usuarios** | Crear, editar, desactivar (no puede eliminar ni cambiar roles) |
| **Configuración** | No tiene acceso |
| **Tickets** | Ver todos, tomar, asignar, iniciar, resolver, entregar, cancelar, reabrir |
| **Inventario** | Editar partes, agregar partes a tickets |
| **Clientes** | Crear, editar |
| **Avanzado** | Ver reportes, gestionar plantillas, exportar datos |

### AGENT (Agente)
**Nivel de jerarquía: 2**

Trabaja en tickets asignados. Puede auto-asignarse tickets del pool.

| Categoría | Permisos |
|-----------|----------|
| **Usuarios** | Sin acceso |
| **Configuración** | Sin acceso |
| **Tickets** | Tomar (auto-asignarse), iniciar, resolver, esperar partes, reanudar |
| **Inventario** | Agregar partes a tickets (mientras trabaja) |
| **Clientes** | Crear clientes para nuevos tickets |
| **Avanzado** | Sin acceso |

**Nota:** Los agentes solo pueden ver tickets asignados a ellos y tickets en el pool (sin asignar).

### VIEWER (Solo Lectura)
**Nivel de jerarquía: 1 (mínimo)**

Acceso de solo lectura. No puede realizar acciones.

| Categoría | Permisos |
|-----------|----------|
| **Usuarios** | Sin acceso |
| **Configuración** | Sin acceso |
| **Tickets** | Ver todos (solo lectura) |
| **Inventario** | Sin acceso |
| **Clientes** | Sin acceso |
| **Avanzado** | Ver reportes |

## Roles Legacy (Compatibilidad)

Para mantener compatibilidad con datos existentes:

- **TECHNICIAN** → Mapea a AGENT
- **RECEPTIONIST** → Mapea a VIEWER

## Jerarquía de Roles

```
ADMIN (4) > MANAGER (3) > AGENT (2) > VIEWER (1)
```

### Reglas de Jerarquía

1. Un usuario solo puede modificar usuarios de menor jerarquía
2. Un usuario siempre puede modificar sus propios datos (excepto rol)
3. Solo ADMIN puede cambiar roles de otros usuarios
4. No se puede desactivar al último ADMIN de un tenant

## Permisos por Acción

### Gestión de Usuarios

| Acción | ADMIN | MANAGER | AGENT | VIEWER |
|--------|:-----:|:-------:|:-----:|:------:|
| Crear usuarios | ✅ | ✅ | ❌ | ❌ |
| Editar usuarios | ✅ | ✅ | ❌ | ❌ |
| Eliminar usuarios | ✅ | ❌ | ❌ | ❌ |
| Cambiar roles | ✅ | ❌ | ❌ | ❌ |
| Desactivar usuarios | ✅ | ✅ | ❌ | ❌ |

### Acciones de Tickets

| Acción | ADMIN | MANAGER | AGENT | VIEWER |
|--------|:-----:|:-------:|:-----:|:------:|
| Ver todos los tickets | ✅ | ✅ | ❌* | ✅ |
| Tomar ticket | ✅ | ✅ | ✅ | ❌ |
| Asignar ticket | ✅ | ✅ | ❌ | ❌ |
| Iniciar trabajo | ✅ | ✅ | ✅ | ❌ |
| Resolver ticket | ✅ | ✅ | ✅ | ❌ |
| Entregar ticket | ✅ | ✅ | ❌ | ❌ |
| Cancelar ticket | ✅ | ✅ | ❌ | ❌ |
| Reabrir ticket | ✅ | ✅ | ❌ | ❌ |
| Eliminar ticket | ✅ | ❌ | ❌ | ❌ |

*Los agentes solo ven tickets asignados a ellos y tickets sin asignar.

## Uso en Código

### Verificar Permiso Individual

```typescript
import { hasPermission } from '@/lib/auth-utils';
import type { UserRole } from '@prisma/client';

if (hasPermission(userRole as UserRole, 'canCreateUsers')) {
  // Puede crear usuarios
}
```

### Requerir Permiso (throw en error)

```typescript
import { requirePermission, requireAdmin } from '@/lib/auth-utils';

// Requiere permiso específico
requirePermission(userRole, 'canDeleteUsers');

// Requiere ser admin
requireAdmin(userRole);
```

### Verificar Acceso a Tenant

```typescript
import { validateTenantAccess } from '@/lib/auth-utils';

// Lanza AuthorizationError si hay violación
validateTenantAccess(userTenantId, resourceTenantId);
```

### Verificar Jerarquía

```typescript
import { canModifyUser, getRoleHierarchyLevel } from '@/lib/auth-utils';

// Verificar si puede modificar otro usuario
if (canModifyUser(actorRole, targetRole, isSelf)) {
  // Puede modificar
}

// Obtener nivel de jerarquía
const level = getRoleHierarchyLevel(userRole); // 1-4
```

## Seguridad

### Políticas de Contraseña

- Mínimo 8 caracteres
- Al menos una mayúscula
- Al menos una minúscula
- Al menos un número
- Al menos un carácter especial (!@#$%^&*...)

### Rate Limiting

- Máximo 10 intentos de login por minuto por IP
- Bloqueo de cuenta después de 5 intentos fallidos
- Desbloqueo automático después de 15 minutos

### Protecciones Adicionales

- Soft delete (los usuarios se desactivan, no se eliminan)
- Audit trail completo (createdBy, updatedBy en cada registro)
- Mensajes de error genéricos en login
- Forzar cambio de contraseña en primer inicio con contraseña temporal
- Middleware de protección de rutas

## Archivos Relevantes

| Archivo | Descripción |
|---------|-------------|
| `src/lib/auth-utils.ts` | Definición de permisos y funciones de validación |
| `src/lib/user-actions.ts` | Server actions para gestión de usuarios |
| `src/auth.ts` | Configuración de NextAuth con validaciones |
| `src/middleware.ts` | Protección de rutas y rate limiting |
| `prisma/schema.prisma` | Modelos de datos con campos de auditoría |

## Mejores Prácticas

1. **Siempre verificar permisos en server actions**, no solo en UI
2. **Usar validateTenantAccess** antes de cualquier operación con recursos
3. **No loggear passwords ni tokens** en ninguna circunstancia
4. **Usar soft delete** en lugar de eliminación permanente
5. **Mantener audit trail** registrando createdBy/updatedBy
6. **Verificar jerarquía** antes de modificar otros usuarios

## Próximos Pasos Recomendados

1. **2FA**: Implementar autenticación de dos factores
2. **Email Verification**: Verificación de email para nuevos usuarios
3. **Session Management**: Vista de sesiones activas y logout remoto
4. **API Keys**: Gestión de claves API para integraciones
5. **Custom Roles**: Permitir creación de roles personalizados por tenant
