# 🛠 Deuda Técnica y Mejoras de Arquitectura / UX

Este archivo registra los problemas detectados y resueltos en auditorías de código, accesibilidad, performance y arquitectura del proyecto FIX-AI-NEXT.

---

## 📊 Matriz de Remediación de Deuda Técnica (Auditada)

| ID | Nivel | Descripción | Estado | Solución Aplicada |
| :--- | :--- | :--- | :--- | :--- |
| **D1** | 🔴 Crítica | Clases utilitarias (`grid-cols-*`, `space-y-*`, etc.) sin capa global de tokens | ✅ **Resuelto** | Mapeo completo en `src/app/globals.css` a variables CSS y tokens de diseño (`var(--spacing-*)`, `var(--font-size-*)`, `var(--radius-*)`). |
| **D2** | 🔴 Crítica | Lighthouse CI bloqueado exclusivamente a desktop (`preset: desktop`) | ✅ **Resuelto** | Eliminada restricción de preset en `lighthouserc.json` permitiendo auditoría mobile por defecto. |
| **D3** | 🔴 Crítica | Cobertura reducida en `src/components/ui` y `src/emails` | ✅ **Resuelto** | Creadas 11 suites de testing con Vitest (`Button`, `Badge`, `Card`, `FormControls`, `Modal`, `DataTable`, `PaginationControls`, `Toast`, `BrandLogo`, `SearchInputGroup`, `ExportButton`, `emails.test.tsx`), alcanzando **611 tests pasando en 75 suites**. |
| **D4** | 🟠 Alta | 193 reglas `:hover` sin guarda `@media (hover: hover)` que se pegaban en táctil | ✅ **Resuelto** | Todas las reglas `:hover` en los 47 módulos CSS fueron encapsuladas en `@media (hover: hover)`. **0 reglas desprotegidas restantes**. |
| **D8** | 🟠 Alta | `console.log` sin sanitizar en `src/lib/email-service.ts` | ✅ **Resuelto** | Enmascaramiento de direcciones (`a***@domain.com`) y supresión de cuerpos en logs de producción. |
| **D9** | 🟡 Media | Ausencia de `import 'server-only'` en repositorios y casos de uso | ✅ **Resuelto** | Declarada explícitamente la frontera del servidor en todos los repositorios Prisma, casos de uso y rutas de la API. |

---

## ✅ Resuelto: Errores de Consola y Assets
- **Problema:** Lighthouse detectaba un error de consola al cargar la página principal: `Failed to load resource: 404 (Not Found)` en `/favicon.ico`.
- **Solución aplicada:**
  - Favicon añadido en `src/app/icon.svg` (servido automáticamente por Next.js).
  - `metadataBase` e `icons` configurados en `src/app/layout.tsx`.
  - `lang` corregido a `es` en `src/app/layout.tsx`.
  - `getInitialTheme` en `src/contexts/ThemeContext.tsx` endurecido con `try/catch` sobre `localStorage`.
- **Verificación:** Lighthouse reporta **0 errores de consola** en `/`.

---

## ✅ Resuelto: Accesibilidad y Contraste WCAG AA
- **Problema:** Fallo en la regla 'color-contrast' (6 elementos): texto sobre fondo claro con ratio < 4.5:1.
- **Solución aplicada:**
  - `src/app/page.module.css`: `.featureCard p` usa color con ratio > 6:1 sobre blanco (WCAG AA).
  - `src/app/globals.css`: definidos pasos de escala semántica en los temas (`success/warning/error/info` `-200`/`-300`/`-400`/`-700`/`-900`, `secondary`/`accent` `-700`).
  - Aliases de compatibilidad para tokens legacy.
  - Modo oscuro con paleta de alto contraste para bordes y texto secundario.
- **Verificación:** Lighthouse Accessibility en **1.0 (100%)**, **0 fallos de contraste**.

---

## 🟢 Rendimiento y Fuentes Auto-Hospedadas
- **Problema:** `@import` de Google Fonts en `globals.css` bloqueaba el primer render.
- **Solución aplicada:**
  - Fuente Inter auto-hospedada con `next/font/google` (`src/app/layout.tsx`) con `display: swap`, preload woff2 y variable `--font-inter`.
  - Eliminado `@import` externo.
