# Reglas Obligatorias de Desarrollo — FIX-AI NEXT

> Reglas derivadas de la arquitectura real. **Son obligatorias** para mantener aislamiento, seguridad y consistencia.

## Las 12 reglas

1. **Server Components por defecto.** Usa `'use client'` solo cuando haya interactividad/estado del navegador (hooks de React, eventos, `useState`, `useActionState`). Un componente puramente presentacional NO lleva `'use client'`.

2. **No hay acceso directo a BD desde componentes UI.** Las páginas/componentes no importan Prisma. Toda consulta de datos va por **Server Action** (o Server Component que llame a `getTenantPrisma`). Son un módulo `server-only`.

3. **Valida en el servidor con Zod.** Los schemas viven en `src/lib/schemas.ts` (reutilízalos). El cliente es UX; el servidor es la verdad. No validar solo en cliente.

4. **Nunca confíes en la autorización del cliente.** Ocultar botones no es seguridad. Cada Server Action / Route Handler verifica rol (`requirePermission`…) y tenant usando `session`.

5. **Siempre verifica el contexto de tenant.** Para cualquier modelo tenanted usa `getTenantPrisma(tenantId, userId)`. El `prisma` crudo solo para cron global, auth por email y portal público por número de ticket.

6. **Reutiliza el Design System.** Todo componente de UI reutilizable sale de `src/components/ui/` (Button, Card, Modal, Badge, Input…). No crees variantes sueltas ni clones.

7. **No crees CSS arbitrario cuando existe un token.** Usa `var(--...)` de `src/app/globals.css`; no hardcodees hex/rgba manuales. CSS estilos en **CSS Modules** (`X.module.css`), no inline, salvo excepciones justificadas.

8. **No añadas dependencias sin justificación.** Antes de añadir un paquete, comprueba si lo resuelve lo ya instalado. Describe el porqué en el PR. (Zustand y React Query NO están instalados — no los introduces sin ADR.)

9. **Añade tests para lógica de negocio crítica.** Máquinas de estado, tenancy, inventario/concurrencia, RBAC, POS. Sigue la pirámide: muchos unit, algunos integración, pocos e2e.

10. **Mantén accesibilidad por defecto.** Etiquetas, contraste, foco, ARIA en componentes del kit. Deben superar una revisión en `src/components/ui`.

11. **Cada mutación que afecte cache debe revalidar.** Tras una Server Action que cambia datos, llama `revalidatePath(...)` (las actions ya lo hacen). No rompas la invalidación.

12. **Respeta el patrón de Server Actions.** Ubicación: `src/lib/actions/*-actions.ts` o `src/lib/<dominio>-actions.ts` con `'use server'`. Flujo: validar → autenticar → autorizar → tenant → lógica → BD → resultado.

## Errores que evitar (patrones reales del repo)

- **Fuga cross-tenant**: usar `prisma` crudo para `AuditLog`/modelos tenanted. → `getTenantPrisma`.
- **`'use client'` en componentes presentacionales** sin hooks. → quitar y dejar Server Component.
- **Duplicar lógica** (p. ej. 14 copias locales de `formatCurrency`). → centralizar en `src/lib/utils`/helper compartido.
- **Zod inline duplicado** en rutas si existe en `schemas.ts`.
- **Definir `ActionState`/`UserRole` de nuevo** en cada archivo (ya hay centrales).
- **Iconos SVG inline copiados** — centraliza en un componente Icon (o lucide) en lugar de pastar SVG.
- **CSS con `!important`** para parchear layout — soluciona la especificidad en el módulo.

## Cuándo NO seguir una "regla de estilo" dogmática

Si un patrón del repo ya tiene una convención coherente distinta, **síguela** y deja constancia en el ADR/imPR. Las reglas de tipos/estilo no son dogmas; la coherencia con el código real manda.
