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
| **FASE 1** — SEO Críticos | 🟡 PARCIAL | 7/10 items (3 pendientes: 1.8, 1.9, 1.10) |
| **FASE 2** — Performance Core | 🟡 PARCIAL | 2.1-2.3 parcial (config hecha, webpack muerto bajo Turbopack) |
| **FASE 3** — Accesibilidad AA | 🟡 PARCIAL | 3.1, 3.2, 3.5, 3.6, 3.7 hechos |
| **FASE 4** — Optimización JS | ⬜ PENDIENTE | 0/9 |
| **FASE 5** — SEO Avanzado | ⬜ PENDIENTE | 0/5 |

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

### Hallazgos pendientes (NO corregidos)

| ID | Severidad | Hallazgo | Impacto |
|----|-----------|----------|---------|
| HIGH-01 | 🟠 | 35/43 páginas sin metadata específica (solo 18.6% con `export const metadata`) | SEO: sin descripciones por página |
| HIGH-02 | 🟠 | Brand naming inconsistente (`FIX-AI`, `Dashboard`, sin sufijo — ninguno usa `FIX Workshop`) | SEO: titles desordenados |
| HIGH-03 | 🟠 | 6/8 pages con metadata sin campo `description` | SEO: Google no tiene snippet |
| HIGH-04 | 🟠 | 0% pages con Open Graph propio | Social: previews genéricos |
| HIGH-05 | 🟠 | Sitemap incluye páginas no indexables (`/design-system`, `/login` con prioridad 0.8) | SEO: crawl budget desperdiciado |
| HIGH-06 | 🟠 | 10 rutas ausentes del sitemap (`/dashboard/tickets/pool`, `/dashboard/users`, etc.) | SEO: páginas huérfanas |
| MED-01 | 🟡 | `output: 'standalone'` innecesario en Vercel | Build artifacts innecesarios |
| MED-02 | 🟡 | `productionBrowserSourceMaps: false` redundante (ya es default) | Config muerta |
| MED-03 | 🟡 | `llm.txt` enlaza a `/contact` que no existe | Link roto |
| MED-04 | 🟡 | `robots.txt` prohíbe `/static/` — ruta inexistente | Regla inútil |
| MED-05 | 🟡 | 39 páginas con 0 H1 tags (server-rendered, client components) | A11y: heading hierarchy no verificable |
| MED-06 | 🟡 | `design-system/page.tsx` tiene 2 H1 tags | A11y: heading duplicado |

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
- [ ] **1.8** Meta descriptions específicas por página (dashboard, tickets, login, etc.)
- [ ] **1.9** Verificar un solo `<h1>` por página en todo el dashboard
- [ ] **1.10** JSON-LD structured data (Organization, WebApplication)

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
- [ ] **2.4** Migrar `<img>` → `<Image>` en `AttachmentsSection.tsx` + lazy loading
- [ ] **2.5** Lazy-load charts: `dynamic(() => import('@/components/dashboard/TicketsByStatusChart'), { ssr: false })`
- [ ] **2.6** Lazy-load heavy libs: `jspdf`, `html2canvas`, `xlsx`, `qrcode` (solo en páginas que los usan)
- [ ] **2.7** Code-split dashboard: separar bundles por sección (tickets, customers, reports, pos)

### Día 6-7: Caché y Métricas
- [x] **2.8** Cache headers estáticos (1 año para assets) ✅ 2026-08-20
- [ ] **2.9** Cache API responses (stale-while-revalidate para dashboard stats)
- [ ] **2.10** Configurar `@vercel/speed-insights` + `@vercel/analytics` (ya en deps)
- [ ] **2.11** Bundle analyzer: identificar chunks >200KB

**Entregable**: Lighthouse LCP < 2.5s, TBT < 200ms, CLS < 0.1

---

## 📅 FASE 3: Accesibilidad AA (Semana 3) - **WCAG 2.1 AA**

### Día 8-9: Navegación y Foco
- [x] **3.1** Skip link: "Saltar al contenido principal" en `layout.tsx` ✅ 2026-08-20 (corregido: usa `.skip-link` class, no Tailwind)
- [x] **3.2** `:focus-visible` styles en `globals.css` (outline visible, no solo ring) ✅ 2026-08-20
- [ ] **3.3** Focus trap en Modal (ya tiene ESC, verificar Tab cycle)
- [ ] **3.4** Focus management al abrir/cerrar modals, drawers, toasts

### Día 9-10: Formularios y Errores
- [x] **3.5** Reemplazar `alert()` en `AttachmentsSection.tsx` → Toast accesible (`role="alert"`) ✅ 2026-08-20
- [x] **3.6** Verificar todos los botones icon-only tienen `aria-label` ✅ 2026-08-20
- [x] **3.7** `aria-hidden="true"` en SVGs decorativos (login blobs, iconos de feature cards) ✅ 2026-08-20
- [ ] **3.8** Error messages: asociados con `aria-describedby` + `aria-live="polite"`
- [ ] **3.9** Validación nativa HTML5 + mensajes en español consistentes

### Día 10-11: Semántica y Landmarks
- [ ] **3.10** Landmarks: `<main>`, `<nav>`, `<aside>`, `<header>`, `<footer>` en layout
- [ ] **3.11** Heading hierarchy: H1 → H2 → H3 sin saltos (auditar dashboard, tickets, settings)
- [ ] **3.12** Tablas accesibles: `<th scope="col">`, `<caption>`, keyboard navigation
- [ ] **3.13** Contraste: verificar ratio 4.5:1 (texto) / 3:1 (UI) en todos los temas
- [ ] **3.14** Testing: `npm run test:a11y` (axe-core/playwright)

**Entregable**: 0 violations axe-core, navegación solo teclado funcional

---

## 📅 FASE 4: Optimización JS y DX (Semana 4)

### Día 12-13: Bundle y Carga
- [ ] **4.1** Dynamic imports para páginas pesadas (reports, pos, invoices)
- [ ] **4.2** Tree-shaking: auditar imports de `lucide-react`, `date-fns`, `zod`
- [ ] **4.3** Remover `console.log` producción (ESLint rule `no-console`)
- [ ] **4.4** Source maps: deshabilitar en producción (`productionBrowserSourceMaps: false`)

### Día 13-14: Monitoring y Calidad
- [ ] **4.5** Error Boundary global + per-route
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
| **P1** | Image component + lazy charts | **Perf: LCP -3s** | 6h | ⬜ |
| **P1** | Skip link + focus-visible | **A11y: Navegación teclado** | 3h | ✅ |
| **P1** | Alert() → Toast accesible | **A11y: Errores** | 2h | ✅ |
| **P2** | Dynamic imports heavy pages | **Perf: Bundle -40%** | 4h | ⬜ |
| **P2** | Heading hierarchy audit | **SEO + A11y** | 3h | ⬜ |
| **P3** | JSON-LD structured data | **SEO: Rich snippets** | 4h | ⬜ |
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

---

*Generado: 2026-08-19 | Actualizado: 2026-08-20 | Auditoría estricta: QA Agent*
