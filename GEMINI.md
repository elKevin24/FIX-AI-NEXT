# GEMINI.md - Contexto del Proyecto para Asistente AI

Este archivo sirve como contexto principal para entender la arquitectura, convenciones y flujos de trabajo del proyecto **Multi-Tenant Workshop Management System**.

## 1. Identidad del Proyecto

*   **Nombre:** Multi-Tenant Workshop Management System (FIX-AI-NEXT)
*   **Descripción:** Sistema de gestión para talleres de electrónica con soporte multi-inquilino (multi-tenancy).
*   **Estado:** Prototipo funcional avanzado (MVP completo).
*   **Stack Tecnológico:**
    *   **Framework:** Next.js 16.0.7 (App Router, Turbopack)
    *   **UI Library:** React 19.2.1
    *   **Lenguaje:** TypeScript 5.x
    *   **Base de Datos:** PostgreSQL 14+
    *   **ORM:** Prisma 5.22.0
    *   **Autenticación:** NextAuth.js v5.0.0-beta.30
    *   **Estilos:** CSS Modules (Vanilla CSS con variables)
    *   **Validación:** Zod

## 2. Arquitectura

### Multi-Tenancy
*   **Estrategia:** Shared Database, Shared Schema.
*   **Aislamiento:** Lógico mediante columna `tenantId` en todas las tablas principales.
*   **Implementación:**
    *   **Obligatorio:** Todas las consultas a la base de datos *deben* filtrar por `tenantId`.
    *   **Herramienta:** Se recomienda usar `getTenantPrisma(tenantId)` (`src/lib/tenant-prisma.ts`) para garantizar el aislamiento automáticamente, aunque actualmente muchas rutas usan filtrado manual.
    *   **Middleware:** `src/proxy.ts` protege las rutas y gestiona la sesión.

### Control de Acceso (RBAC)
*   **Roles:** `ADMIN`, `TECHNICIAN`, `RECEPTIONIST`.
*   **Definición:** Enum `UserRole` en `prisma/schema.prisma`.
*   **Verificación:** Se debe verificar `session.user.role` en Server Actions y API Routes antes de ejecutar acciones críticas.

### Estructura de Directorios Clave
*   `prisma/`: Schema de BD, migraciones y seeds.
*   `src/app/`: Rutas de la aplicación (App Router).
    *   `api/`: Endpoints REST.
    *   `dashboard/`: Área privada protegida.
    *   `login/`: Página de acceso.
    *   `tickets/status/`: Área pública para consulta de clientes.
*   `src/components/ui/`: Componentes base del Design System (Button, Card, Input, etc.).
*   `src/lib/`: Utilidades (Prisma client, helpers de auth).
*   `src/services/`: Lógica de negocio reutilizable (ej. `user.service.ts`).

## 3. Base de Datos

### Modelo de Datos (Resumen)
*   **Tenant:** La entidad raíz.
*   **User:** Pertenece a un Tenant. Roles definidos.
*   **Customer:** Clientes del taller (por Tenant).
*   **Ticket:** Orden de reparación. Estados: `OPEN`, `IN_PROGRESS`, `WAITING_FOR_PARTS`, `RESOLVED`, `CLOSED`.
*   **Part:** Inventario de repuestos.
*   **AuditLog:** Registro de cambios críticos.

### Comandos de Gestión
*   **Local (Docker):**
    *   Iniciar: `npm run db:start`
    *   Migrar: `npm run db:migrate`
    *   Resetear: `npm run db:reset` (Borra todo y aplica seed)
    *   Seed: `npm run db:seed`
    *   Studio: `npm run db:studio`
*   **Neon (Cloud):**
    *   Migrar: `npm run neon:migrate`
    *   Seed: `npm run neon:seed`
    *   Studio: `npm run neon:studio`

## 4. Convenciones de Desarrollo

### Estilo de Código
*   **TypeScript:** Estricto. Evitar `any`. Usar interfaces/tipos para props y respuestas de API.
*   **Server Components:** Por defecto. Usar `'use client'` solo cuando sea necesario (interactividad, hooks).
*   **Estilos:** CSS Modules. Naming convention: `styles.clase`. Usar variables CSS del Design System (`var(--color-primary-500)`).
*   **Importaciones:** Usar alias `@/` (ej. `@/components/ui`, `@/lib/prisma`).

### Patrones UI
*   Usar componentes de `src/components/ui/` siempre que sea posible para mantener consistencia.
*   Para formularios, usar Server Actions para el manejo del envío si es posible, o `fetch` a API routes para interacciones complejas.
*   Feedback al usuario mediante `Alert` o mensajes de estado.

### Manejo de Errores
*   En API Routes: Retornar `NextResponse.json({ error: "Mensaje" }, { status: X })`.
*   Validar siempre `tenantId` y permisos (`role`) antes de cualquier operación de escritura/lectura sensible.

## 5. Flujos de Trabajo Comunes

### Crear una Nueva Funcionalidad
1.  **Modelo de Datos:** Si requiere cambios en BD, editar `prisma/schema.prisma` y ejecutar `npm run db:migrate`.
2.  **Backend:** Crear Server Action o API Route en `src/app/api/...`. **Importante:** Asegurar validación de `tenantId`.
3.  **Frontend:** Crear página en `src/app/dashboard/...`. Usar componentes UI existentes.
4.  **UI:** Estilar con CSS Modules usando variables del Design System.

### Deployment
*   El proyecto está configurado para desplegarse en Vercel.
*   Las migraciones se aplican automáticamente en el pipeline de CI/CD (o manualmente con `npm run neon:migrate`).

## 6. Comandos Útiles
*   `npm run dev`: Servidor de desarrollo.
*   `npm run lint`: Verificar calidad de código.
*   `npx prisma generate`: Regenerar cliente Prisma (necesario tras cambios en schema).

---
**Nota para el Agente:** Antes de realizar cambios complejos, verificar siempre `ARCHITECTURE.md` y `DATABASE_GUIDE.md` para asegurar conformidad con los patrones establecidos.
