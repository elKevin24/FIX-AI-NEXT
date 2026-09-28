# Roadmap Mobile-First — FIX-AI-NEXT

> **Estado:** auditoría completada. Implementación bloqueada por permisos del filesystem (ver §0).
> **Alcance:** `src/` completo — 65 `*.module.css`, 7 `layout.tsx`, 40+ `page.tsx`.
> **Método:** todos los hallazgos de este documento fueron verificados leyendo el código.
> Las rutas con `:línea` son comprobables. Ningún hallazgo procede de suposiciones.

---

## §0 · Bloqueo previo (resuelve antes de empezar)

Auditoría hecha sobre el árbol real. Resultado:

| Constraint | Detalle | Impacto |
|---|---|---|
| `sudo` pide password | No puedo corregir permisos yo mismo | — |
| 79 directorios root-owned | Incluidos `src/app/dashboard/`, `src/app/login/`, `src/components/`, `src/app/globals.css` | **11 de 16 archivos objetivo no editables** |
| `.git/refs/heads/feature/` root-owned | No se pueden crear ramas `feature/*` ni commitear en la rama actual | `cannot lock ref` |
| `.git/HEAD` root-owned | `git switch` **sí** funciona (git lo renombra, no escribe in-place) | Menos grave |

Comando a ejecutar (una sola vez):

```bash
sudo chown -R "$(id -u):$(id -g)" /mnt/datos/GitHub/FIX-AI-NEXT
```

| `.next/` con 1511 archivos root-owned | `next build` muere en `EACCES: unlink build-diagnostics.json` | **El build no corre → no hay verificación posible** |
| 515 archivos root-owned en total (excl. `node_modules`/`.git`/`.next`) | — | — |

Verificación: `find src -type d ! -writable | wc -l` → debe dar `0`.
Segundo gate: `npx next build` debe dejar de dar `EACCES`.

Rama objetivo: `feature/mobile-first` desde `develop` (HEAD y develop son idénticos: mismo tree `61fae9c`).

### Baseline medido (antes de tocar nada)

| Gate | Estado | Detalle |
|---|---|---|
| `npx tsc --noEmit` | ✅ verde | exit 0, 0 errores |
| `npx eslint .` | ⚠️ **2 errores preexistentes** | `src/components/pdf/WorkOrderHalfLetterPDF.tsx:499` → 2× `react/no-unescaped-entities` por `(5.5" x 8.5")` sin escapar. **Está en HEAD**, no en el WIP sin commitear. |
| `npx vitest run` | ⚠️ 556 pass, 3 files fallan | Los 3 fallos son specs de **Playwright** en `e2e/` (untracked) que vitest intenta cargar: `test.describe() from an async test.describe() block`. No es código del repo, es config: vitest no excluye `e2e/`. |
| `npx next build` | ❌ bloqueado | `EACCES` por `.next` root-owned |

**Consecuencia para la verificación:** `npm run check:all` **no puede quedar verde** mientras persistan los 2 errores de lint de `WorkOrderHalfLetterPDF.tsx:499` — son de `develop`, ajenos a mobile-first. Criterio de no-regresión aplicado: *ningún error nuevo*; los 2 de lint y los 3 files de `e2e/` son la línea base conocida.

---

## §1 · Hallazgos verificados

### 🔴 CRÍTICOS

| # | Ubicación | Hallazgo | Verificación |
|---|---|---|---|
| C1 | `src/components/ui/ExportButton.module.css:7,19-21` + `ExportButton.tsx:11,29-51` | `.dropdown{display:none}` revelado solo por `.wrapper:hover`. **No hay `onClick` ni estado `isOpen`** — el único estado es `loading`. El botón "📥 Exportar" es **inalcanzable en cualquier táctil**. Rompe exportar en tickets, parts, invoices y pos-sales. | `grep -c isOpen src/components/ui/ExportButton.tsx` → 0 |
| C2 | `src/components/tickets/AttachmentsSection.module.css:83-84,89,93-95` | `.deleteBtn{width:24px;height:24px;opacity:0}`, revelado solo por `.card:hover`. Sin `@media (hover:hover)` ni `:focus-within`. **Borrar un adjunto es invisible e inclicable en móvil.** | `grep -n 'hover' src/components/tickets/AttachmentsSection.module.css` |
| C3 | `src/app/tickets/status/TicketSearchClient.tsx:283-320` | `<style jsx global>` con `outline:none !important` en `*`, `*:focus`, `*:focus-visible`, `*:active`, `*:hover` y `-webkit-tap-highlight-color:transparent !important`. **Anula el `:focus-visible` de `globals.css:626-630`.** WCAG 2.4.7 incumplido, sin feedback táctil, en la página pública de tracking. | `grep -n 'jsx global' src/app/tickets/status/TicketSearchClient.tsx` |
| C4 | `src/app/dashboard/admin/audit-logs/page.tsx:42,47,56,58` | Wrapper `overflow:'hidden'` (**no `auto`**) + `whiteSpace:'nowrap'` + `padding:'1rem 1.5rem'` × 4 columnas = 192px de padding. A 375px la tabla se **recorta sin scroll posible**: datos inalcanzables. | `grep -n "overflow" src/app/dashboard/admin/audit-logs/page.tsx` |
| C5 | `src/app/dashboard/dashboard.module.css:11` | `.container{overflow:hidden}` en el branch **base** (móvil). `.container` no es scroller en <768px (es `min-height`, no `height`), luego `overflow:hidden` crea un clipping context **sin scroll** → todo `position:sticky` interno se ancla a una caja que no se mueve. Rompe `TopNav.module.css:2` y `PageHeader.module.css:58` en **todo el dashboard móvil**. | `sed -n '6,13p' src/app/dashboard/dashboard.module.css` |
| C6 | **Tailwind NO instalado** | Sin dependencia en `package.json` (63 deps, 0 tailwind), sin `tailwind.config.*`, sin `postcss.config.*`, 0 directivas `@tailwind`/`@apply`. **~300 clases utilitarias en 18 `.tsx` se renderizan sin ningún estilo.** | `node -e "…"` + `ls tailwind.config.*` → no existe |
| C7 | `src/components/ui/Modal.module.css:5-6` | `width:100vw` (incluye el gutter del scrollbar → ~15px de exceso lateral) y `height:100vh` (viewport **alto**: con la barra de URL expandida el footer del modal queda bajo el cromo de iOS). `max-height:90vh` (`:23`). Sin `dvh`, sin safe-area. | `sed -n '1,10p' src/components/ui/Modal.module.css` |
| C8 | `src/app/layout.tsx:87-95` + `public/manifest.json:5` | Falta `viewportFit:"cover"` y **0 usos de `env(safe-area-inset-*)`** en todo el repo, con `display:"standalone"`. La PWA en iOS se dibuja bajo el notch y bajo el home indicator. | `grep -rc 'safe-area-inset' src/ \| grep -v ':0'` → vacío |
| C9 | `src/app/layout.tsx:144` + 6 `<main>` | El root ya emite `<main id="main-content">`; dentro hay **otro** `<main>`: `dashboard/layout.tsx:57`, `login/page.tsx:20`, `forgot-password/page.tsx:14`, `reset-password/page.tsx:84`, `dashboard/tickets/[id]/ticket80mm/page.tsx:109`, `~offline/page.tsx:5`. HTML inválido, landmarks duplicados, el skip-link salta al `<main>` equivocado. | `grep -rn '<main' src/app --include=*.tsx` → 7 |
| C10 | `src/app/dashboard/settings/service-templates/TemplatePartsManager.tsx:165-166` | `styles['tableWrapper']` y `styles['partsTable']` **no existen** en `service-templates.module.css` (22 clases ausentes en el componente) → `class="undefined"`, sin `overflow-x` ni estilos de tabla. | comparar clases usadas vs definidas |
| C11 | Inputs con `font-size` < 16px (zoom iOS) | iOS hace auto-zoom al enfocar y **bloquea el scroll** sin un segundo gesto. Afecta cada formulario: `Form.module.css:24,116` (15px, **design system completo**), `tickets.module.css:194`, `SearchInputGroup.module.css:35`, `pos.module.css:307`, `WorkloadDashboard.module.css:96` (13px), + ~20 más. | `grep -rn 'font-size: *\(0\.\|1[0-5]\)\?\.\?[0-9]*rem' src/**/*.module.css` |

### 🟠 IMPORTANTES

| # | Ubicación | Hallazgo |
|---|---|---|
| I1 | `src/components/ui/DataTable.tsx:46` + `DataTable.module.css:22-28` | La tabla de tickets tiene 7-8 columnas y **no hay alternativa en cards** (0 `useMediaQuery`/`matchMedia` en DataTable). En 375px hay que hacer scroll horizontal ~900px. Es la vista principal de la app. Igual en `InvoicesClient.tsx:178` (7 col) y `RecentTicketsTable.tsx:75` (6 col). |
| I2 | `src/components/ui/Button.module.css:171-175,177-181` | `size="sm"` → ~28px de alto, **91 usos**. `.baseSize{height:2.5rem}` → 40px. Es el problema sistémico de touch target. |
| I3 | `history.module.css:206-212` / `SimpleTicketForm.module.css:263-273` / `Modal.module.css:47-57` / `notifications.module.css:146-157` | Touch targets: ~14×24px, ~14×21px, ~22×32px, 28×28px. Notificaciones incluye **acciones destructivas a 28px**. |
| I4 | `src/components/dashboard/NotificationBell.module.css:4-17` | 36×36px, en el TopNav de todo el dashboard. |
| I5 | `src/app/dashboard/pos/pos.module.css:117-128,121-122,144-145` | En <1024px el POS pasa a `grid 1fr / rows 1fr 1fr` con `min-height:0` + `overflow:hidden` en altura **indefinida** → riesgo de colapso a 0 y recorte del carrito o del grid de productos. |
| I6 | `src/components/dashboard/TopNav.module.css:2,11` | `position:sticky` + `background:transparent` + `pointer-events:none`. El comentario de la línea 11 lo admite: el contenido pasa por debajo al scrollear y el badge queda ilegible. |
| I7 | `src/app/globals.css:636-643,583,166,164` | `.container` con gutter fijo 24px nunca reducido. `h1` a 36px fijos sin `clamp()`. **0 media queries de anchura en 1449 líneas** — el archivo no tiene breakpoints y delega todo a los módulos. Único `clamp()` del repo: `page.module.css:165`. |
| I8 | `next.config.ts:30` | `deviceSizes:[640,750,828,1080,1200,1920,2048,3840]` **reemplaza** los defaults de Next y elimina 360/390/414/480/540. Un `<Image>` en móvil real descarga el candidato de 640px → **1.7×–2.1× más bytes**, impacto directo en LCP. |
| I9 | 183 reglas `:hover` sin guarda `@media (hover:hover)` | 0 usos de `hover`/`any-hover`/`pointer:coarse` en todo el repo. C1 y C2 son los casos bloqueantes. |
| I10 | CSS muerto | `invoices.module.css:154-161,257-275` (el `display:none` de columnas nunca aplica: la vista usa `DataTable`, no ese módulo) y `page.module.css:182-188,355-375` (`recentTicketsTable` no se usa en ningún `.tsx`). La mitigación móvil existente **no hace nada**. |
| I11 | `src/app/dashboard/parts/parts.module.css:316-321`, `pos/quotations/quotations.module.css:776-782` | `min-width:800px` y `600px` dentro de `overflow-x:auto` (patrón correcto de scroll) → 425px y 225px de scroll extra a 375px. Sin alternativa en cards. |
| I12 | `src/app/globals.css:561` vs `:547-552` | `overflow-x:hidden` en `body` pero **no en `html`**. En iOS Safari es inconsistente. Además **enmascara** bugs de desbordamiento en lugar de arreglarlos. |
| I13 | `lighthouserc.json:11` | `"preset":"desktop"`. La CI **solo audita desktop** — por eso 11 críticos sobrevivieron. |
| I14 | Breakpoints inconsistentes | 5 cortes sin escala semántica: 320 (2, **muertos**: 375/360 no los activan), 480 (3), 640 (4), 768 (20), 900 (2), 1024 (3). Y 4 archivos **mezclan** `min-width` y `max-width`: `parts`, `searchFilters`, `tickets`, `WorkloadDashboard`. |

### 🟢 LO QUE YA ESTÁ BIEN (no tocar)

- `viewport` correcto: `width:device-width`, `initialScale:1`, `maximumScale:5`. **No hay anti-zoom** (WCAG 1.4.4 ✅).
- Skip-link funcional `layout.tsx:106-111` + `globals.css:1272-1291`.
- `prefers-reduced-motion` (`:1330`) y `prefers-contrast: high` (`:1358-1449`) muy completos.
- `sidebar.module.css` con `position:fixed` off-canvas en móvil y comment explícito *"Mobile First Strategy"* (`:1,284`) — **el mejor archivo del repo**.
- `searchFilters.module.css:191,201` — patrón ejemplar de 3 rangos bien definidos.
- `TicketStatusCard.module.css:38,170,190,252` — sus 4 media queries son `min-width` sobre base `repeat(2,1fr)`. Mobile-first impecable.
- `pos.module.css:320-330` y `Sidebar.module.css:119,188,225` — touch targets ya resueltos con `min-height:44px`.
- `minmax(280–380px,1fr)` en 9 sitios: **no** es riesgo de overflow, colapsa solo.
- `Customers` y `Users` con cards responsive correctas (`customers.module.css:307-333`, `users.module.css:235-244`).
- 0 ocorrências de `w-screen`, `100vw` en TSX, `grid-cols-[N` fijo, `whitespace-nowrap` en TSX.

---

## §2 · Decisiones pendientes (bloquean el alcance)

**D1 · Estrategia de Tailwind (C6) — la decisión de mayor impacto.**
~300 utilidades muertas en 18 `.tsx`. Tres caminos, ninguno trivial:

| Opción | Trabajo | Efecto |
|---|---|---|
| (a) Instalar Tailwind v4 | bajo | Resucita 300 clases de golpe, pero **reintroduce specificity** y puede pisar los 65 CSS Modules. Hay que auditar conflictos. |
| (b) Migrar los 18 `.tsx` a CSS Modules | muy alto | Coherente con el resto del repo, pero reescribe 18 vistas críticas. |
| (c) Arreglar solo las clases de alto impacto | medio | Arregla `StatCard` (componente 100% muerto), `TicketsClient` (truncado inexistente), `~offline` (sin estilos). Sin tocar el resto. |

**Mi recomendación: (c) primero.** `StatCard` es compartido y hoy no escala de móvil a desktop; `~offline` está literalmente sin estilos; `TicketsClient` no trunca. Son 3 fixes acotados. (a)/(b) son proyectos aparte.

**D2 · Permisos** — ejecutar el `chown` de §0. Sin esto no se puede ni editar ni compilar.

**D2b · Errores de lint preexistentes** — `WorkOrderHalfLetterPDF.tsx:499` (2× `react/no-unescaped-entities`). Fix de un carácter (`&quot;`). ¿Los arreglo en un commit aparte, los dejo, o los incluyo en la Fase 1? Enquanto tanto son la línea base de no-regresión.

**D2c · `vitest` arrastra los specs de Playwright** — `vitest.config.ts` no excluye `e2e/`, así que 3 specs de Playwright se ejecutan como tests unitarios y fallan. Ruido que oculta fallos reales. ¿Lo excluyo?

**D3 · Rama** — `feature/mobile-first` (requiere §0). Alternativa si no se corrigen permisos: `fix/mobile-first` (verificado que sí funciona).

---

## §3 · Fases

Cada fase termina con commit propio. Gate de verificación: `npm run check:all`
(= `tsc --noEmit && eslint . && vitest run && next build`) **más** el criterio de aceptación de la tarea.

### Fase 0 · Permisos y rama
- [ ] `sudo chown -R kev:kev` el repo → `find src -type d ! -writable | wc -l` = 0
- [ ] `git checkout -b feature/mobile-first develop` (working tree con el WIP de half-letter intacto, currently en `stash@{0}`)
- [ ] Baseline: `npm run check:all` en verde **antes** de tocar nada, para distinguir fallos preexistentes de regresiones.

**Criterio:** `check:all` verde y rama creada.

### Fase 1 · P0 — Funcionalidad rota en táctil
Ficheros: `ExportButton.{tsx,module.css}`, `AttachmentsSection.module.css`, `TicketSearchClient.tsx`, `audit-logs/page.tsx`, `Modal.module.css`.

- [ ] **MF-101 (C1)** `ExportButton`: estado `isOpen` + `onClick` + `aria-expanded`; abrir también con teclado (Enter/Escape). Mantener `:hover` como refuerzo, nunca como único mecanismo. Un botón que no funciona en móvil no es un problema de estilo, es una feature rota.
- [ ] **MF-102 (C2)** `AttachmentsSection.deleteBtn`: 44×44px mínimo, `opacity:1` por defecto en táctil vía `@media (hover:none)`, y `:focus-within` para teclado. Botón destructivo hoy invisible en móvil.
- [ ] **MF-103 (C3)** `TicketSearchClient`: eliminar el `<style jsx global>` que anula focus/tap-highlight. Si el motivo fue eliminar un anillo duplicate, usar `:focus-visible` correctamente en vez de `* { outline:none !important }`.
- [ ] **MF-104 (C4)** `audit-logs`: `overflow:'hidden'` → `overflowX:'auto'`, y mover el `nowrap` a la celda de fecha únicamente.
- [ ] **MF-105 (C7)** `Modal`: `width:100vw`→`width:100%` con `inset:0`, `100vh`→`100dvh`, `max-height` a `dvh`, y `padding-bottom: env(safe-area-inset-bottom)` en el footer.

**Criterio:** cada uno verificado por `grep` de la ausencia del patrón roto + `check:all` verde + prueba manual en DevTools a 375px.

### Fase 2 · P0 — Estructura y layout
Ficheros: `dashboard.module.css`, `layout.tsx` (root y de grupo), `globals.css`.

- [ ] **MF-201 (C5)** `.container{overflow:hidden}`: sacarlo del branch base; dejarlo solo en ≥768px donde sí es scroller (`height:100vh`). Devuelve el `sticky` de TopNav y de la barra de búsqueda en móvil.
- [ ] **MF-202 (C9)** Eliminar los 6 `<main>` anidados → `<div>`/`<section>`. El root conserva `<main id="main-content">` como único landmark. El skip-link debe apuntar al de contenido.
- [ ] **MF-203 (C8)** `viewportFit:"cover"` + `env(safe-area-inset-*)` en TopNav, Sidebar y footer de modal.
- [ ] **MF-204 (C10)** `TemplatePartsManager`: definir las 22 clases ausentes o mapear a existentes. Hoy renderiza `class="undefined"`.
- [ ] **MF-205 (I12)** `overflow-x:hidden` en `html` además de `body`, y **dejar de usarlo como red de seguridad**: documentar que enmascara bugs. Idealmente quitarlo de `body` una vez arreglados los desbordes reales.

**Criterio:** `grep -c '<main' src/app/**/*.tsx` = 1 · `sticky` verificado en móvil a 375px · `check:all` verde.

### Fase 3 · P1 — Touch targets e input táctil
- [ ] **MF-301 (C11)** Subir a ≥16px los `font-size` de **todos** los inputs. Prioridad: `Form.module.css:24,116` (design system, arregla de golpe el grueso de formularios). ⚠️ Es el fix de mayor valor: mata el auto-zoom de iOS y el scroll bloqueado.
- [ ] **MF-302 (I2)** `Button size="sm"` de 28px → 36px en móvil vía `@media (hover:none)`, manteniendo 28px en desktop. 91 usos se benefician de un solo cambio; no romper el layout de escritorio.
- [ ] **MF-303 (I3,I4)** Targets sueltos: `history.module.css:206-212`, `SimpleTicketForm.module.css:263-273`, `Modal.module.css:47-57`, `notifications.module.css:146-157`, `NotificationBell.module.css:4-17` → ≥44×44px.
- [ ] **MF-304** `touch-action: manipulation` en botones/enlaces y `-webkit-tap-highlight-color` global (hoy solo 4 declaraciones aisladas). Quita el delay de ~300ms del doble-tap-zoom en Android.
- [ ] **MF-305 (I6)** `TopNav`: de `background:transparent` a un fondo con `backdrop-filter` + borde inferior.hoy el badge queda ilegible al scrollear.

**Criterio:** ningún botón/link/icono interactivo por debajo de 44×44px en móvil · sin auto-zoom en iOS · `check:all` verde.

### Fase 4 · P1 — Tablas y zoom en el dashboard
- [ ] **MF-401 (I1)** `DataTable`: vista cards bajo 768px para tickets e invoices. Es la vista principal de la app; hoy exige scroll horizontal de ~900px en 375px. `useMediaQuery` + render alternativo, preservando semántica de tabla en desktop.
- [ ] **MF-402 (I5)** Verificar el colapso del grid del POS en <1024px con `min-height:0` + `overflow:hidden` en altura indefinida. **Validar en dispositivo real**, no solo por CSS.
- [ ] **MF-403 (I7)** `globals.css`: `h1` y `--font-size-*` con `clamp()`; gutter de `.container` reducido en móvil. Añadir los primeros `@media (min-width)` del archivo.
- [ ] **MF-404 (I8)** `next.config.ts`: añadir 360/390/414/480 a `deviceSizes`. Impacto directo en LCP.
- [ ] **MF-405 (I10)** Eliminar el CSS muerto (`invoices.module.css:154-161,257-275`, `page.module.css:182-188,355-375`) o conectarlo a las vistas reales.

**Criterio:** tablas legibles a 375px sin scroll en las vistas principales · LCP no degradado · `check:all` verde.

### Fase 5 · P2 — Saludar la base
- [ ] **MF-501 (C6, decisión D1)** Aplicar la estrategia de Tailwind acordada.
- [ ] **MF-502 (I9, I14)** Normalizar breakpoints a una escala semántica y unificar los 4 archivos que mezclan `min-width`/`max-width`. Eliminar los `max-width:320px` muertos.
- [ ] **MF-503 (I13)** `lighthouserc.json`: añadir preset móvil a la CI. **Sin esto, cualquier regresión mobile vuelve a colarse** — es la causa raíz de que 11 críticos sobrevivieran.
- [ ] **MF-504 (I9)** Revisar las 183 reglas `:hover` y envolver las dependientes en `@media (hover:hover)`.

**Criterio:** Lighthouse móvil en CI + `check:all` verde.

---

## §4 · Definición de Hecho

- [ ] Fases 0-4 cerradas; fase 5 según alcance acordado.
- [ ] `npm run check:all` verde.
- [ ] Ningún elemento interactivo < 44×44px en móvil.
- [ ] Ningún input con `font-size` < 16px.
- [ ] Cero scroll horizontal de página a 320/360/375/414px.
- [ ] Ninguna función inaccesible por teclado ni por táctil.
- [ ] CI auditando móvil (Fase 5, o explícitamente diferido conticket).

**Estimación:** Fase 0 5min · Fase 1 1-1.5h · Fase 2 1.5-2h · Fase 3 2-3h (301 es la más pesada) · Fase 4 3-4h (401 la más pesada) · Fase 5 variable.
