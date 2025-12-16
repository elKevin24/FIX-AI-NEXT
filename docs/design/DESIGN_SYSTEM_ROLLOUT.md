# Plan de Aplicación del Design System

## Páginas a Actualizar (en orden de prioridad):

### ✅ Completadas:

1. `/dashboard/customers` - Ultra-polished glassmorphism
2. `/dashboard/users` - Ultra-polished glassmorphism
3. `/dashboard/tickets` - Minimalista con tablas

### 🔄 Pendientes (Orden de ejecución):

#### Alta Prioridad:

1. **`/dashboard/parts`** - Inventario de Repuestos

   - Crear `parts.module.css` con glassmorphism
   - Stats cards con glass effect
   - Tabla con diseño minimalista
   - Badge de stock bajo

2. **`/dashboard` (main)** - Dashboard Principal

   - Crear `dashboard.module.css`
   - Stats cards glassmorphism
   - Grid responsivo

3. **`/dashboard/settings`** - Configuración
   - Crear `settings.module.css`
   - Formularios glassmorphism
   - Cards de opciones

#### Media Prioridad:

4. **`/dashboard/tickets/[id]`** - Detalle de Ticket
5. **`/dashboard/tickets/create`** - Crear Ticket
6. **`/dashboard/tickets/pool`** - Pool de Tickets

#### Baja Prioridad (Forms):

7. **`/dashboard/customers/create`**
8. **`/dashboard/customers/[id]/edit`**
9. **`/dashboard/users/create`**
10. **`/dashboard/users/[id]/edit`**
11. **`/dashboard/parts/create`**
12. **`/dashboard/parts/[id]/edit`**

## Patrón de Diseño a Aplicar:

```css
/* Card Base */
background: rgba(255, 255, 255, 0.65);
backdrop-filter: blur(24px) saturate(180%);
border: 1px solid rgba(255, 255, 255, 0.6);
border-radius: 1rem;
box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.04),
    0 8px 24px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);

/* Hover */
transform: translateY(-4px);
box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.06),
    0 16px 48px rgba(0, 0, 0, 0.1);

/* NO backgrounds internos */
- Sin gradientes en headers/footers (  transparent)
- Sin borders entre elementos
- Solo glassmorphism en card principal
```

## Próximos Pasos:

1. Parts page (empezar ahora)
2. Dashboard main
3. Settings
4. Demás páginas progresivamente
