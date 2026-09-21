# 🛠 Deuda Técnica y Mejoras de UX/UI

Este archivo registra los problemas detectados por auditorías automáticas (Lighthouse) que deben ser resueltos para alcanzar los estándares de calidad del proyecto.

## ✅ Resuelto: Errores de Consola
- **Problema:** Lighthouse detectaba un error de consola al cargar la página principal: `Failed to load resource: 404 (Not Found)` en `/favicon.ico` (no existía favicon en el proyecto).
- **Solución aplicada:**
  - Favicon añadido en `src/app/icon.svg` (servido automáticamente por Next.js).
  - `metadataBase` e `icons` configurados en `src/app/layout.tsx`.
  - `lang` corregido a `es` en `src/app/layout.tsx`.
  - `getInitialTheme` en `src/contexts/ThemeContext.tsx` endurecido con `try/catch` sobre `localStorage` para evitar crash en navegadores con almacenamiento restringido.
- **Verificación:** Lighthouse reporta **0 errores de consola** en `/`.

## ✅ Resuelto: Accesibilidad (Contraste)
- **Problema:** Fallo en la regla 'color-contrast' (6 elementos): texto `#718096` sobre fondo blanco con ratio 4.01:1 (mínimo 4.5:1).
- **Solución aplicada:**
  - `src/app/page.module.css`: `.featureCard p` ahora usa `#5a6470` (ratio ~6:1 sobre blanco, WCAG AA).
- **Solución complementaria (design system):**
  - `src/app/globals.css`: definidos los pasos de escala semántica faltantes en los 3 temas (`success/warning/error/info` `-200`/`-300`/`-400`/`-700`/`-900`, `secondary`/`accent` `-700`) que eran referenciados por componentes activos (Badge, Button, tickets, invoices, POS) pero nunca definidos.
  - Añadidos aliases de compatibilidad para tokens legacy (`--text-primary`, `--primary`, `--danger`, `--bg-tertiary`, etc.) que usaban módulos antiguos (POS, caja, tarjetas de técnico) y que quedaron huérfanos al dejar de importarse `design-system.css`.
  - Tema dark ahora define `secondary`/`accent` (antes heredaban los valores claros del tema light, rompiendo el contraste en modo oscuro).
- **Verificación:** Lighthouse con categoría Accessibility en **1.0**, **0 fallos de contraste** en `/`.

## 🟢 Mejorado: Rendimiento
- **Problema:** `@import` de Google Fonts (`fonts.googleapis.com`) en `globals.css` era un recurso externo render-blocking.
- **Solución aplicada:**
  - Fuente Inter ahora se sirve de forma auto-hospedada con `next/font/google` (`src/app/layout.tsx`), con `display: swap`, preload de woff2 y variable `--font-inter`.
  - Eliminado el `@import` externo de `globals.css`; `--font-family-base` referencia `var(--font-inter)`.
- **Verificación:** Lighthouse: Performance **99**, sin peticiones externas a Google Fonts. Queda un único punto render-blocking aceptable: `globals.css` (~30 KB, diseño necesario para el primer paint).
- **Nota:** `src/styles/design-system.css` (código muerto, no importado en ningún lugar) fue **eliminado**; sus utilidades (`container`, `flex`, `gap-4`, etc.) ya existen en `globals.css`.
- **Pendiente menor:** `unused-javascript` (~29 KiB) y revisión periódica del tamaño de `globals.css`.
