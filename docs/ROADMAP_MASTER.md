# 🗺️ Roadmap Central — FIX-AI-NEXT

**Fecha:** 2026-08-23
**Propósito:** Índice único de todos los roadmaps del proyecto, con su estado de cumplimiento verificado contra el código (no solo los checkboxes de cada documento).

---

## 📊 Resumen General

**Total de documentos tipo roadmap: 8** (7 roadmaps ejecutables + 1 documento de análisis)

| # | Roadmap | Ubicación | Alcance | Estado | Cumplimiento |
|---|---------|-----------|---------|--------|:------------:|
| 1 | Roadmap General (legacy) | [`docs/archived/ROADMAP.md`](./archived/ROADMAP.md) | Producto completo (Features 1–4) | 🟢 Casos de Uso Core listos (Aprobación Cliente, Cortes Caja, Compras) | ~85% |
| 2 | Plantillas de Servicio (Feature 2.5) | [`docs/archived/ROADMAP_SERVICE_TEMPLATES.md`](./archived/ROADMAP_SERVICE_TEMPLATES.md) | Sistema de plantillas de servicio | ✅ Implementado (Fases 1–6) | ~90% |
| 3 | Triggers y Middleware | [`docs/TRIGGERS_MIDDLEWARE_ROADMAP.md`](./TRIGGERS_MIDDLEWARE_ROADMAP.md) | Integridad de datos en PostgreSQL + Prisma | 🟢 Completo (Triggers en DB, TenantPrisma, Tests y Docs) | ~95% |
| 4 | Seguridad | [`docs/SECURITY_ROADMAP.md`](./SECURITY_ROADMAP.md) | Hardening P0–P3 | 🟢 Completo (P0-P3, CI/CD y dependencias limpias) | 100% |
| 5 | Frontend SEO/A11y/Performance | [`docs/ROADMAP_FRONTEND_AUDIT.md`](./ROADMAP_FRONTEND_AUDIT.md) | SEO, accesibilidad WCAG AA, performance | 🟢 Cumplimiento alto (Meta, JSON-LD, H1 únicos, focus trap Modal, lazy charts) | ~90% |
| 6 | Ticket Workflow UI | [`docs/TICKET_WORKFLOW_ROADMAP.md`](./TICKET_WORKFLOW_ROADMAP.md) | UI del workflow de tickets | 🟢 UI & Backend sincronizados (Diálogos, Workflow, Timeline) | ~95% |
| 7 | Mejoras del Sistema de Temas | [`docs/THEME_IMPROVEMENTS_ROADMAP.md`](./THEME_IMPROVEMENTS_ROADMAP.md) | Accesibilidad/UX de temas | 🟢 Sprints 1–2 completados + prefers-contrast | ~90% |
| 8 | Análisis de Alineación | [`docs/ROADMAP_ALIGNMENT_ANALYSIS.md`](./ROADMAP_ALIGNMENT_ANALYSIS.md) | Análisis (no ejecutable) | 📄 Documento histórico | N/A |

---

## 📋 Detalle por Roadmap

### 1. Roadmap General del Producto (legacy — archivado)
`docs/archived/ROADMAP.md`

| Feature | Estado declarado | Estado real |
|---------|------------------|-------------|
| Feature 1: Gestión Core (MVP) | ✅ Completado | ✅ Completado |
| Feature 2: Operaciones Esenciales | 🟢 Alto | ✅ Etapas 1, 2 (Aprobación cliente, inventario atómico) y 3 completas |
| Feature 2.5: Plantillas de Servicio | ⏳ Planificado | ✅ **Ya implementado** (ver #2) |
| Feature 3: Administración Avanzada | 🟢 En progreso | ✅ Arqueos y Cortes X/Z de Caja completados; Portal de aprobación listo; Facturación FEL catalogada como Add-on |
| Feature 4: Inteligencia Artificial (FIX-AI) | 💭 Visión | ❌ No iniciado (0/3 etapas) |

> Este documento fue el roadmap maestro original. Quedó archivado; este archivo (`ROADMAP_MASTER.md`) lo sustituye como índice.

---

### 2. Plantillas de Servicio — Feature 2.5 ✅
`docs/archived/ROADMAP_SERVICE_TEMPLATES.md`

El documento dice "📋 Pendiente de Aprobación" pero está **desactualizado**: la implementación existe y está verificada en el código.

| Fase | Contenido | Estado real |
|------|-----------|-------------|
| 1. Fundamentos de datos | Modelos `ServiceTemplate`, migraciones | ✅ Hecho (`prisma/schema.prisma:337`) |
| 2. Seed de plantillas | Catálogo inicial | ⚠️ Sin seed dedicado encontrado en `prisma/seeds/` |
| 3. Backend — Server Actions | CRUD de plantillas | ✅ Hecho |
| 4. Frontend — Gestión Admin | `/dashboard/settings/service-templates` | ✅ Hecho (list, create, edit) |
| 5. Uso en creación de tickets | Integración en wizard | ✅ Hecho (`src/app/dashboard/tickets/create-with-template/TicketWizard.tsx`) |
| 6. Analytics | Dashboard de plantillas | ✅ Hecho (`service-templates/analytics/page.tsx`) |
| 7. Mejoras avanzadas | Versionado, checklists interactivos, precios dinámicos, plantillas multi-tenant | ❌ Pendiente (opcional) |

---

### 3. Triggers y Middleware 🟢 (~92%)
`docs/TRIGGERS_MIDDLEWARE_ROADMAP.md`

| Fase | Contenido | Estado real |
|------|-----------|-------------|
| 1. Triggers PostgreSQL | Stock negativo, numeración secuencial, validación de fechas, updatedAt | ✅ **Implementado** — 9 migraciones en `prisma/migrations/*trigger*` |
| 2. Tenant Isolation | Filtrado multi-tenant vía `TENANTED_MODELS` en `src/lib/tenant-prisma.ts` | ✅ **Implementado** |
| 3. Testing y validación | Tests de triggers y constraints | ✅ **Implementado** (`tests/triggers/triggers-integrity.test.ts`) |
| 4. Documentación y mantenimiento | Referencia técnica de triggers | ✅ **Implementado** (`docs/TRIGGERS_REFERENCE.md`) |

---

### 4. Seguridad 🟢 (100%)
`docs/SECURITY_ROADMAP.md`

| Fase | Ítems completados | Estado real |
|------|:-----------------:|-------------|
| 0. Remediación crítica (P0) | 4/4 ✅ | ✅ Completa |
| 1. Hardening red/headers/endpoints (P1) | 4/4 ✅ | ✅ Completa |
| 2. Multi-tenant & RBAC en APIs (P1) | 3/3 ✅ | ✅ Completa |
| 3. Recuperación de contraseñas (P2) | 3/3 ✅ | ✅ Completa |
| 4. Archivos, dependencias & CI/CD (P3) | 3/3 ✅ | ✅ Completa (CI en `.github/workflows/ci.yml` y dependencias auditadas) |

---

### 5. Frontend SEO / Accesibilidad / Performance 🟢 (~85%)
`docs/ROADMAP_FRONTEND_AUDIT.md`

| Fase | Estado | Progreso |
|------|--------|----------|
| 1. SEO Críticos | 🟢 Completo | 10/10 (Meta descriptions, H1 únicos verificados, JSON-LD @graph) |
| 2. Performance Core | 🟢 Alto | 8/11 (Next/Image, fonts, lazy charts recharts, lazy qrcode/jspdf/html2canvas, Speed Insights + Analytics) |
| 3. Accesibilidad AA | 🟡 Medio-Alto | 10/14 (skip link, focus-visible, focus trap Modal, aria-labels, toasts, tablas con scope+caption, landmarks verificados) |
| 4. Optimización JS/DX | 🟡 Parcial | 2/9 por checklist (error boundaries globales; source maps off) |
| 5. SEO Avanzado | 🟡 Parcial | 3/5 |

---

### 6. Ticket Workflow UI 🟢 (~95%)
`docs/TICKET_WORKFLOW_ROADMAP.md`

| Fase | Contenido | Estado |
|------|-----------|--------|
| Backend completo | API actions, pool, workload, disponibilidad, lógica de negocio | ✅ Completo |
| UI Fase 1 | Dashboard de Workload (admin) + Pool de Tickets (técnico) | ✅ Completo |
| UI Fase 2 | Panel de acciones + 8 diálogos de confirmación y flujo | ✅ Completo |
| UI Fase 3 | Timeline de actividad unificado | ✅ Completo |
| UI Fase 4 | Tests de integración | ✅ Completo (suite Vitest 490 tests) |

---

### 7. Mejoras del Sistema de Temas 🟢 (~90%)
`docs/THEME_IMPROVEMENTS_ROADMAP.md`

| Fase | Contenido | Estado |
|------|-----------|--------|
| Sprint 1 (críticos a11y) | reduced-motion, navegación teclado, screen readers, fallback backdrop-filter | ✅ Completado |
| Sprint 2 (UX) | tema automático (`prefers-color-scheme`), sincronización entre pestañas | ✅ Completado |
| Backlog | `prefers-contrast` | ✅ Completado |

---

### 8. Análisis de Alineación (no ejecutable) 📄
`docs/ROADMAP_ALIGNMENT_ANALYSIS.md`

Documento histórico conservado para referencia.

---

## 🎯 Próximo Trabajo Sugerido (Features de Negocio & Fase 3/4)

1. **Notificaciones Automatizadas (Feature 2 Etapa 2):** WhatsApp Business API / Webhooks de estado.
2. **Administración Avanzada (Feature 3):** Portal público de autoservicio de clientes para seguimiento de estado y presupuestos.
3. **Auditorías Continuas (Fase 4/5):** Lighthouse CI ✅ + **PWA Service Worker ✅ (Serwist/@serwist-turbopack, offline fallback `/~offline`)**. Pendiente: PWA Web Push (VAPID).

---

## 🔧 Reglas de Mantenimiento

- Cada roadmap hijo mantiene sus propios checkboxes; este archivo **solo refleja su estado agregado**.
- Al completar una fase de un roadmap hijo, actualizar aquí su fila en la tabla resumen.
- Cuando un roadmap se complete al 100%: moverlo a `docs/archived/` y marcarlo ✅ aquí.
- Verificación de estado real > texto del documento: confirmar contra código antes de marcar progreso (varios docs estaban desactualizados: SECURITY, TRIGGERS, SERVICE_TEMPLATES).

---

*Última actualización: 2026-08-23 — estados verificados contra el código fuente.*
