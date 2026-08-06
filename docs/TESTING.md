# Estrategia de Pruebas para FIX-AI-NEXT

## Objetivo
Establecer un plan de pruebas con foco en:
- lógica de negocio crítica
- validaciones de autorización/tenant
- componentes UI clave
- acciones de servidor / rutas API

## Tipo de pruebas

### 1. Pruebas unitarias
- `src/lib/` contiene la mayoría de la lógica de negocio y utilidades.
- Priorizar tests de `actions`, `ticket-state-machine`, `concurrency-inventory`, `technician-actions`, `service-template-actions`, `pos-actions`, `invoice-actions`.

### 2. Pruebas de componentes
- UI clave en `src/components/` y `src/app/`.
- Ejemplos actuales: `Sidebar.test.tsx`, `GlobalSearch.test.tsx`, `login/page.test.tsx`.

### 3. Pruebas de servidor / acciones
- Rutas y server actions en `src/app/api/`.
- Usar mocks para `prisma`, `auth`, `redirect` y `next/navigation`.

## Comandos

- Ejecutar suite de pruebas: `npm test`
- Ejecutar pruebas con cobertura: `npm run test:coverage`

## Configuración de Vitest

El archivo `vitest.config.ts` establece:
- `environment: 'jsdom'`
- alias `@` para `./src`
- variables de entorno dummy usadas en tests
- cobertura con `c8` y reportes `text` + `html`

## Recomendaciones

1. Mantener los tests rápidos y deterministas con mocks.
2. No depender de la base de datos real para suites unitarias.
3. Agregar cobertura para validaciones de tenant y permisos.
4. En el futuro, evaluar una capa E2E con Playwright o Cypress.
