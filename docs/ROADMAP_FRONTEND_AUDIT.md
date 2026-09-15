# Roadmap: Frontend SEO, Accesibilidad y Performance

## Resumen Ejecutivo

| Categoría | Crítico | Alto | Medio | Total |
|-----------|---------|------|-------|-------|
| **SEO/HTML** | 4 | 3 | 3 | 10 |
| **Accesibilidad** | 0 | 3 | 5 | 8 |
| **Performance** | 1 | 5 | 3 | 9 |
| **JS/Dev** | 0 | 1 | 4 | 5 |
| **TOTAL** | **5** | **12** | **15** | **32** |

---

## Estado General

| Fase | Estado | Completado |
|------|--------|------------|
| **FASE 1** — SEO Críticos | 🟢 COMPLETA | 10/10 items |
| **FASE 2** — Performance Core | 🟢 ALTO | 8/11 (pendiente: 2.7 code-split secciones, 2.9 cache API, 2.11 bundle analyzer) |
| **FASE 3** — Accesibilidad AA | 🟡 MEDIO-ALTO | 10/14 (pendiente: 3.9 validación HTML5, 3.11 jerarquía completa, 3.13 contraste, 3.14 tests axe) |
| **FASE 4** — Optimización JS | 🟡 PARCIAL | 2/9 por checklist (4.4, 4.5; pendiente re-auditar claims previos de esta fase) |
| **FASE 5** — SEO Avanzado | 🟡 PARCIAL | 3/5 |

---

## Auditoría Estricta — 2026-08-20

**Calificación general: D+ (3.2/10)** — 17 hallazgos (4 críticos, 7 altos, 6 medios)

### Hallazgos corregidos (2026-08-20)

| ID | Severidad | Hallazgo | Fix |
|----|-----------|----------|-----|
| CRIT-01 | 🔴 | Skip link roto — 10 clases Tailwind muertas (no hay Tailwind en el proyecto) | `className="skip-link"` usa CSS existente en `globals.css:1273` |
| CRIT-02 | 🔴 | webpack splitChunks 60 líneas完全 muerto bajo Turbopack | Eliminado `webpack()` callback completo |
| CRIT-03 | 🔴 | Sitemap ruta fantasma `/dashboard/technicians` (404) | Reemplazada por `/dashboard/technicians/workload` |
| CRIT-04 | 🔴 | Favicon/apple-touch-icon son SVG — iOS no soporta SVG para touch icons | Generados `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `favicon.ico` |
| HIGH-07 | 🟠 | Build warning — Cache-Control redundante en `/_next/static/` | Eliminada regla redundante (Next.js ya sirve con immutable) |
| BONUS | 🟠 | TS4111 en `proxy.ts` — `process.env.UPSTASH_*` | Acceso con bracket notation `process.env['UPSTASH_*']` |
| MED-01 | 🟡 | `output: 'standalone'` innecesario en Vercel | Ya ausente de `next.config.ts` (verificado 2026-08-23) |
| MED-02 | 🟡 | `productionBrowserSourceMaps: false` redundante | Ya ausente de `next.config.ts` (verificado 2026-08-23) |
| MED-03 | 🟡 | `llm.txt` enlaza a `/contact` que no existe | Recreado sin links rotos (2026-08-23) |
| MED-04 | 🟡 | `robots.txt` prohíbe `/static/` — ruta inexistente | `robots.ts` reescrito sin la regla (verificado 2026-08-23) |
| HIGH-01 | 🟠 | 35/43 páginas sin metadata específica | Metadata (title + description) agregada a todas las páginas faltantes (2026-08-23) |
| HIGH-03 | 🟠 | Páginas con metadata sin campo `description` | Todas las páginas con metadata incluyen `description` (2026-08-23) |
| HIGH-04 | 🟠 | 0% pages con Open Graph propio | OG por página en rutas clave + herencia completa del layout (2026-08-23) |
| MED-05 | 🟡 | 39 páginas con 0 H1 tags (server-rendered, client components) | Verificado: todas las páginas renderizan exactamente un `<h1>` vía `PageHeader` (incluye client components); saltos de nivel corregidos en returns/quotations/tickets (2026-08-23) |
| MED-06 | 🟡 | `design-system/page.tsx` tiene 2 H1 tags | H1 secundario → H2; además la página es `noindex` (2026-08-23) |

### Hallazgos pendientes (NO corregidos)

| ID | Severidad | Hallazgo | Impacto |
|----|-----------|----------|---------|
| HIGH-02 | 🟠 | Brand naming inconsistente (`FIX-AI`, `Dashboard`, sin sufijo — ninguno usa `FIX Workshop`) | SEO: titles desordenados |
| HIGH-05 | 🟠 | Sitemap incluye páginas no indexables (`/design-system`, `/login` con prioridad 0.8) | ✅ Ya corregido en código: sitemap solo incluye `/` y `/tickets/status` (verificado 2026-08-23); `/design-system` ahora con `noindex` |
| HIGH-06 | 🟠 | 10 rutas ausentes del sitemap (`/dashboard/tickets/pool`, `/dashboard/users`, etc.) | N/A: rutas privadas no indexables, su exclusión del sitemap es correcta |

> **Nota heavy libs (2026-08-23, corregida):** `jspdf` y `html2canvas` **SÍ se usan** bajo import dinámico en `src/components/tickets/TicketActions.tsx` (`handleDownloadPDF` / `handleDownloadImage`) — no remover. `xlsx` y `@react-pdf/renderer` solo se usan server-side (API routes), no afectan el bundle cliente. Todas las libs pesadas ya están fuera de los bundles iniciales.

---

## 📅 FASE 1: Críticos SEO (Semana 1) - **BLOQUEAN INDEXACIÓN**

### Día 1-2: Archivos Fundamentales
- [x] **1.1** Crear `public/` directory ✅ 2026-08-20
- [x] **1.2** `src/app/robots.ts` - Generación dinámica de robots.txt ✅ 2026-08-20
- [x] **1.3** `src/app/sitemap.ts` - Sitemap XML automático ✅ 2026-08-20 (corregido: ruta fantasma eliminada)
- [x] **1.4** `public/llm.txt` - Permisos para crawlers IA ✅ 2026-08-20
- [x] **1.5** Favicon completo en `public/` (.ico, .png, .svg, apple-touch-icon) ✅ 2026-08-20 (corregido: PNGs generados, SVG removido)

### Día 2-3: Metadata & Canonical
- [x] **1.6** `metadataBase` + canonical URLs en `layout.tsx` ✅ 2026-08-20
- [x] **1.7** Open Graph / Twitter Cards completos ✅ 2026-08-20
- [x] **1.8** Meta descriptions específicas por página (dashboard, tickets, login, etc.) ✅ 2026-08-23 (metadata agregada a las ~20 páginas faltantes; client pages vía `layout.tsx`)
- [x] **1.9** Verificar un solo `<h1>` por página en todo el dashboard ✅ 2026-08-23 (verificado: todas usan `PageHeader` con un único `<h1>`; saltos h1→h3/h4 corregidos en returns, quotations, tickets/pool y tickets/[id])
- [x] **1.10** JSON-LD structured data (Organization, WebApplication) ✅ 2026-08-23 (`@graph` con Organization + WebApplication en `layout.tsx`)

**Entregable**: `npm run build` → verificar `/robots.txt`, `/sitemap.xml`, `/llm.txt` accesibles ✅

---

## 📅 FASE 2: Performance Core (Semana 2) - **LCP 5.8s → <2.5s**

### Día 4-5: Config Next.js
- [x] **2.1** `next.config.ts` completo ✅ 2026-08-20
  - `images` (formats, remotePatterns, deviceSizes) ✅
  - `experimental.optimizePackageImports` (recharts, @tanstack/react-table, lucide-react, date-fns) ✅
  - `headers()` con security headers ✅
  - ~~`webpack` splitChunks~~ → **ELIMINADO** (Turbopack ignora webpack config; chunk splitting requiere configuración Turbopack nativa)
- [x] **2.2** Font optimization: `preload`, `size-adjust`, `fallback` ✅ (Inter via `next/font/google` con `display: "swap"`)
- [x] **2.3** Compresión: verificar `compress: true` + brotli/gzip en Vercel ✅

### Día 5-6: Imágenes y Carga
- [x] **2.4** Migrar `<img>` → `<Image>` en `AttachmentsSection.tsx` + lazy loading ✅ 2026-08-23 (verificado: `import Image from 'next/image'`, sin `<img>` remanentes)
- [x] **2.5** Lazy-load charts: recharts fuera del bundle inicial vía `next/dynamic` `{ ssr: false }` ✅ 2026-08-23 (`ReportsClient.tsx` + nuevo `ReportsCharts.tsx`)
- [x] **2.6** Lazy-load heavy libs ✅ 2026-08-23 — `qrcode` ahora `import()` dinámico en `Ticket80mm.tsx`; `jspdf`/`html2canvas` ya usaban `import()` dinámico en `TicketActions.tsx`; `xlsx`/`@react-pdf/renderer` verificados server-side only
- [ ] **2.7** Code-split dashboard: separar bundles por sección (tickets, customers, reports, pos)

### Día 6-7: Caché y Métricas
- [x] **2.8** Cache headers estáticos (1 año para assets) ✅ 2026-08-20
- [ ] **2.9** Cache API responses (stale-while-revalidate para dashboard stats)
- [x] **2.10** Configurar `@vercel/speed-insights` + `@vercel/analytics` ✅ 2026-08-23 (`<SpeedInsights />` y `<Analytics />` en `src/app/layout.tsx`; nota: `@vercel/analytics` NO estaba en deps pese al comentario original — instalado ^2.0.1)
- [ ] **2.11** Bundle analyzer: identificar chunks >200KB

**Entregable**: Lighthouse LCP < 2.5s, TBT < 200ms, CLS < 0.1

---

## 📅 FASE 3: Accesibilidad AA (Semana 3) - **WCAG 2.1 AA**

### Día 8-9: Navegación y Foco
- [x] **3.1** Skip link: "Saltar al contenido principal" en `layout.tsx` ✅ 2026-08-20 (corregido: usa `.skip-link` class, no Tailwind)
- [x] **3.2** `:focus-visible` styles en `globals.css` (outline visible, no solo ring) ✅ 2026-08-20
- [x] **3.3** Focus trap en Modal (Tab cycle + Shift+Tab dentro del diálogo) ✅ 2026-08-23 (`src/components/ui/Modal.tsx`)
- [x] **3.4** Focus management al abrir/cerrar modals ✅ 2026-08-23 (foco inicial al primer elemento enfocable; foco devuelto al elemento disparador al cerrar)

### Día 9-10: Formularios y Errores
- [x] **3.5** Reemplazar `alert()` en `AttachmentsSection.tsx` → Toast accesible (`role="alert"`) ✅ 2026-08-20
- [x] **3.6** Verificar todos los botones icon-only tienen `aria-label` ✅ 2026-08-20
- [x] **3.7** `aria-hidden="true"` en SVGs decorativos (login blobs, iconos de feature cards) ✅ 2026-08-20
- [x] **3.8** Error messages: asociados con `aria-describedby` + `aria-invalid` ✅ 2026-08-23 (`Input.tsx`, `Select.tsx`, `Textarea.tsx` ya vinculaban error/helper vía ids generados con `useId`; se añadió `role="alert"` para anuncio dinámico)
- [ ] **3.9** Validación nativa HTML5 + mensajes en español consistentes

### Día 10-11: Semántica y Landmarks
- [x] **3.10** Landmarks: verificado 2026-08-23 — `<aside aria-label="Menú de navegación">` (Sidebar), `<nav>` interno, `<header>` en TopNav, `<main id="main-content" tabIndex={-1}>` en layout raíz. `<footer>` no aplica (sin contenido de pie por diseño)
- [ ] **3.11** Heading hierarchy: H1 → H2 → H3 sin saltos (avance 2026-08-23: saltos corregidos en `pos/returns`, `pos/quotations`, `tickets/pool`, `tickets/[id]`; falta auditar settings y resto de dashboard)
- [x] **3.12** Tablas accesibles ✅ 2026-08-23 — 106 `<th>` con `scope="col"` en las 15 tablas nativas del dashboard; 22 `<caption className="sr-only">` descriptivos añadidos; `DataTable` ahora acepta prop `caption`
- [ ] **3.13** Contraste: verificar ratio 4.5:1 (texto) / 3:1 (UI) en todos los temas
- [ ] **3.14** Testing: `npm run test:a11y` (axe-core/playwright)

**Entregable**: 0 violations axe-core, navegación solo teclado funcional

---

## 📅 FASE 4: Optimización JS y DX (Semana 4)

### Día 12-13: Bundle y Carga
- [ ] **4.1** Dynamic imports para páginas pesadas (reports, pos, invoices)
- [ ] **4.2** Tree-shaking: auditar imports de `lucide-react`, `date-fns`, `zod`
- [ ] **4.3** Remover `console.log` producción (ESLint rule `no-console`)
- [x] **4.4** Source maps: deshabilitados en producción ✅ 2026-08-23 (verificado: `productionBrowserSourceMaps` ausente de `next.config.ts` — ver MED-02)

### Día 13-14: Monitoring y Calidad
- [x] **4.5** Error Boundary global + per-route ✅ 2026-08-23 (`src/app/error.tsx` con `role="alert"`, mensaje + digest y botón "Intentar de nuevo" (`retry()`) / "Ir al inicio"; `src/app/global-error.tsx` con documento propio `<html lang="es">` — convención de esta versión Next: prop `retry`, no `reset`)
- [ ] **4.6** Loading skeletons consistentes (ya hay `Toast`, `StatCard`, verificar `Suspense`)
- [ ] **4.7** Empty states en todas las tablas/listas
- [ ] **4.8** Console branding + separation dev/prod logs
- [ ] **4.9** Preload critical chunks: `<link rel="preload" as="script">`

---

## 📅 FASE 5: SEO Avanzado y Mantenimiento (Continuo)

### Semanas 5+
- [ ] **5.1** Core Web Vitals monitoring (Vercel Speed Insights + Web Vitals lib)
- [ ] **5.2** Structured data: BreadcrumbList, FAQPage, Product/Service
- [ ] **5.3** Internationalization: `lang="es"`, hreflang si multi-idioma
- [ ] **5.4** PWA: manifest.json, service worker, offline fallback
- [ ] **5.5** Automated audits: CI pipeline con Lighthouse CI + axe-core

---

## 🎯 Métricas de Éxito (KPIs)

| Métrica | Actual | Objetivo | Fecha |
|---------|--------|----------|-------|
| **Lighthouse Performance** | ~45 | **≥90** | Semana 2 |
| **LCP** | 5.8s | **<2.5s** | Semana 2 |
| **TBT** | ? | **<200ms** | Semana 2 |
| **CLS** | ? | **<0.1** | Semana 2 |
| **Axe violations** | ? | **0** | Semana 3 |
| **Bundle JS total** | ~2.5MB | **<800KB** | Semana 2 |
| **Indexación Google** | 0% | **100% páginas** | Semana 1 |
| **Core Web Vitals (field)** | N/A | **Verde** | Semana 5 |

---

## 🛠️ Comandos Útiles

```bash
# Desarrollo
npm run dev

# Auditoría completa
npm run check:all

# Build + análisis bundle
ANALYZE=true npm run build

# Lighthouse CI local
npx lhci autorun

# Accesibilidad
npx playwright test --project=chromium --grep a11y

# TypeScript strict
npx tsc --noEmit
```

---

## 📋 Checklist Diario (Definition of Done)

Antes de cada PR:
- [ ] `npm run check:all` pasa
- [ ] No nuevos warnings consola
- [ ] Lighthouse local > 85 performance
- [ ] axe-core 0 violations en páginas tocadas
- [ ] Bundle size no incrementa >10KB sin justificación
- [ ] Meta tags actualizados si nueva página
- [ ] Tests pasan (`npm run test`)

---

## 🔄 Priorización por Impacto

| Prioridad | Tarea | Impacto | Esfuerzo | Estado |
|-----------|-------|---------|----------|--------|
| **P0** | robots.txt + sitemap.xml + llm.txt | **SEO: Indexación total** | 2h | ✅ |
| **P0** | Favicon + OG tags | **SEO: CTR + Social** | 1h | ✅ |
| **P0** | next.config.ts optimizado | **Perf: LCP, Bundle** | 4h | ✅ (parcial) |
| **P1** | Image component + lazy charts | **Perf: LCP -3s** | 6h | 🟡 (lazy charts ✅; `<Image>` pendiente 2.4) |
| **P1** | Skip link + focus-visible | **A11y: Navegación teclado** | 3h | ✅ |
| **P1** | Alert() → Toast accesible | **A11y: Errores** | 2h | ✅ |
| **P2** | Dynamic imports heavy pages | **Perf: Bundle -40%** | 4h | 🟡 (reports ✅; resto pendiente 4.1) |
| **P2** | Heading hierarchy audit | **SEO + A11y** | 3h | 🟡 (H1 únicos + saltos críticos ✅; auditoría completa pendiente 3.11) |
| **P3** | JSON-LD structured data | **SEO: Rich snippets** | 4h | ✅ |
| **P3** | PWA manifest + SW | **UX: Instalable** | 6h | ⬜ |

---

## 📌 Archivos Modificados

| Archivo | Estado | Cambios |
|---------|--------|---------|
| `src/app/layout.tsx` | ✅ | metadata completa, skip link `.skip-link`, `<main id="main-content">`, icons PNG |
| `src/app/globals.css` | ✅ | `.skip-link`, `.sr-only`, `.sr-only:focus`, `:focus-visible`, `prefers-reduced-motion` |
| `src/app/robots.ts` | ✅ | Genera `/robots.txt` dinámico |
| `src/app/sitemap.ts` | ✅ | Genera `/sitemap.xml` (corregido: sin ruta fantasma) |
| `next.config.ts` | ✅ | images, optimizePackageImports, security headers, cache (webpack eliminado) |
| `public/favicon.svg` | ✅ | SVG principal |
| `public/favicon.ico` | ✅ | ICO 32×32 (legacy) |
| `public/apple-touch-icon.png` | ✅ | PNG 180×180 (iOS) |
| `public/icon-192.png` | ✅ | PNG 192×192 (PWA) |
| `public/icon-512.png` | ✅ | PNG 512×512 (PWA) |
| `public/llm.txt` | ✅ | AI crawler permissions |
| `public/manifest.json` | ✅ | PWA manifest |
| `src/proxy.ts` | ✅ | Bracket notation para env vars |
| `src/components/ui/Modal.tsx` | ✅ | Focus trap Tab/Shift+Tab, foco inicial, retorno de foco al disparador (2026-08-23) |
| `src/app/dashboard/reports/ReportsClient.tsx` + `ReportsCharts.tsx` | ✅ | Recharts extraído y lazy-load con `next/dynamic { ssr: false }` (2026-08-23) |
| `src/components/tickets/Ticket80mm.tsx` | ✅ | `qrcode` con import dinámico fuera del bundle inicial (2026-08-23) |
| `src/app/dashboard/pos/returns/*`, `pos/quotations/*` | ✅ | h3→h2 en stat cards/secciones (+ selectores CSS actualizados), sin saltos de heading (2026-08-23) |
| `src/components/tickets/TicketPoolView.tsx` | ✅ | workloadTitle h3→h2 (2026-08-23) |
| `src/app/dashboard/tickets/[id]/TicketDetailView.tsx` | ✅ | Labels h4→span, elimina salto h2→h4 (2026-08-23) |
| `src/app/design-system/page.tsx` | ✅ | H1 duplicado→H2 (2026-08-23) |
| `src/app/error.tsx` + `src/app/global-error.tsx` | ✅ | Error boundaries accesibles con `retry()` (2026-08-23) |
| `src/app/layout.tsx` | ✅ | + `<SpeedInsights />`, `<Analytics />` (2026-08-23) |
| `src/components/ui/Input/Select/Textarea.tsx` | ✅ | `role="alert"` en mensajes de error (aria-invalid/describedby ya existían) (2026-08-23) |
| Tablas del dashboard (15 archivos) | ✅ | 106 `<th scope="col">` + 22 captions sr-only; `DataTable` con prop `caption` (2026-08-23) |
| `@vercel/analytics` | ✅ | Instalado ^2.0.1 (no estaba en deps pese al checklist original) |

---

*Generado: 2026-08-19 | Actualizado: 2026-08-23 | Auditoría estricta: QA Agent*
