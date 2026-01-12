# GEMINI.md - Contexto del Proyecto para Asistente AI

Este archivo sirve como contexto principal para entender la arquitectura, convenciones, estado actual y flujos de trabajo del proyecto **Multi-Tenant Workshop Management System**.

## 1. Identidad del Proyecto

*   **Nombre:** Multi-Tenant Workshop Management System (FIX-AI-NEXT)
*   **Descripción:** Sistema de gestión para talleres de electrónica con soporte multi-inquilino (multi-tenancy) y plantillas de servicio.
*   **Estado:** **Fase 2.5 Completada** (Plantillas de Servicio). En proceso de consolidación y pruebas.
*   **Stack Tecnológico:**
    *   **Framework:** Next.js 16.0.7 (App Router, Turbopack)
    *   **UI Library:** React 19.2.1
    *   **Lenguaje:** TypeScript 5.x
    *   **Base de Datos:** PostgreSQL 14+
    *   **ORM:** Prisma 5.22.0
    *   **Autenticación:** NextAuth.js v5.0.0-beta.30
    *   **Validación:** Zod (Estándar obligatorio para Server Actions)
    *   **Estilos:** CSS Modules (Vanilla CSS con variables)

## 2. Arquitectura y Seguridad

### Multi-Tenancy (Crítico)
*   **Estrategia:** Shared Database, Shared Schema.
*   **Aislamiento:** Lógico mediante columna `tenantId` en todas las tablas principales.
*   **Implementación Obligatoria:**
    *   **Lectura/Escritura:** Usar **SIEMPRE** `getTenantPrisma(tenantId)` (`src/lib/tenant-prisma.ts`). Esto inyecta automáticamente el filtro `where: { tenantId }`.
    *   **Prohibido:** Usar `prisma.model.find...` directamente en lógica de negocio de usuarios normales. Solo permitido para Super Admin o tareas de sistema globales.

### Seguridad y Validación
*   **Zod Schemas:** Todas las *Server Actions* que reciben input del usuario (FormData) deben validarse usando esquemas Zod definidos en `src/lib/schemas.ts`.
*   **Patrón de Actions:**
    1.  Autenticación (`auth()`).
    2.  Validación de Tenant (`session.user.tenantId`).
    3.  Validación de Input (`Schema.safeParse(formData)`).
    4.  Operación BD con `getTenantPrisma`.
*   **RBAC:** Verificar `session.user.role` para acciones sensibles (ADMIN, TECHNICIAN, RECEPTIONIST).

### Estructura de Directorios Clave
*   `prisma/`: Schema de BD, migraciones.
*   `src/app/`: App Router.
    *   `dashboard/`: Área privada protegida.
    *   `dashboard/settings/service-templates/`: Gestión de plantillas.
    *   `api/`: Endpoints REST (ej. para búsqueda dinámica).
*   `src/lib/`:
    *   `actions.ts`: Server Actions generales (Usuarios, Clientes, Tickets V1).
    *   `service-template-actions.ts`: Lógica de plantillas de servicio.
    *   `schemas.ts`: Definiciones Zod.
    *   `tenant-prisma.ts`: Cliente Prisma aislado.

## 3. Estado del Desarrollo (Roadmap)

### ✅ Completado
*   **Core:** Autenticación, Multi-tenancy, CRUD básico.
*   **Tickets V1:** Creación, edición, estados, notas.
*   **Seguridad:** Hardening de `actions.ts`, implementación masiva de Zod.
*   **Feature 2.5 (Plantillas de Servicio):**
    *   Schema `ServiceTemplate`, `TemplateDefaultPart`.
    *   CRUD de plantillas con UI dedicada.
    *   Creación de tickets desde plantillas con consumo atómico de inventario.
    *   Gestor de partes por defecto en plantillas.

### 🚧 En Progreso / Pendiente
1.  **Notificaciones:** Sistema automatizado (Email/In-app) para cambios de estado y asignaciones.
2.  **Pruebas (Testing):** Estrategia formal de tests (Unitarios/E2E) con Vitest/Playwright. Actualmente hay tests básicos pero se requiere cobertura completa.
3.  **Reportes Avanzados:** Mejorar la visualización de métricas financieras y operativas.
4.  **Facturación (POS):** Módulo de caja y facturación (Feature 3).

## 4. Convenciones de Desarrollo

### Estilo de Código
*   **TypeScript:** Estricto. No usar `any`.
*   **Server Components:** Preferidos por defecto.
*   **Client Components:** Solo para interactividad (`'use client'`).
*   **Formularios:** Usar `FormData` en Server Actions, parseado y validado con Zod.

### Base de Datos
*   Si modificas `schema.prisma`:
    1.  `npx prisma generate`
    2.  `npm run db:migrate` (local) o `npm run neon:migrate` (prod).

## 5. Comandos Útiles
*   `npm run dev`: Servidor de desarrollo.
*   `npm run build`: Verificar compilación (TypeScript/Next.js).
*   `npm run lint`: Linter.
*   `npx prisma studio`: Explorador de BD.

---
**Nota para el Agente:** Al implementar nuevas funciones, prioriza la seguridad: usa siempre `getTenantPrisma` y crea el esquema Zod correspondiente en `src/lib/schemas.ts` antes de escribir la lógica.
