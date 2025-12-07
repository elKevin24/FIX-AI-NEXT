# Design System - FIX-AI NEXT

Un sistema de diseño profesional y completo para la aplicación de gestión de talleres multi-tenant.

## 📋 Índice

- [Introducción](#introducción)
- [Colores](#colores)
- [Tipografía](#tipografía)
- [Espaciado](#espaciado)
- [Componentes](#componentes)
- [Utilidades](#utilidades)
- [Modo Oscuro](#modo-oscuro)

---

## Introducción

El Design System de FIX-AI NEXT está construido con CSS Variables (Custom Properties) para facilitar la personalización, el theming y el mantenimiento. Todos los componentes son reutilizables y siguen principios de diseño consistentes.

**Características principales:**
- ✅ Paleta de colores profesional y accesible
- ✅ Sistema de espaciado consistente
- ✅ Componentes React TypeScript reutilizables
- ✅ Soporte para modo oscuro
- ✅ Totalmente responsive
- ✅ Animaciones y transiciones fluidas

---

## Colores

### Paleta Primaria (Tech Blue)

```css
--color-primary-50:  hsl(220, 100%, 97%)
--color-primary-500: hsl(220, 75%, 55%)  /* Color principal */
--color-primary-600: hsl(220, 70%, 45%)  /* Hover/Active */
--color-primary-900: hsl(220, 55%, 15%)
```

**Uso:**
- Botones principales
- Enlaces
- Estados activos
- Elementos destacados

### Colores Semánticos

#### Success (Verde)
```css
--color-success-500: hsl(140, 70%, 50%)
--color-success-600: hsl(140, 65%, 40%)
```
**Uso:** Mensajes de éxito, badges de estado "Resuelto"

#### Warning (Amarillo)
```css
--color-warning-500: hsl(45, 95%, 55%)
--color-warning-600: hsl(45, 90%, 45%)
```
**Uso:** Alertas, avisos, estados "Esperando"

#### Error (Rojo)
```css
--color-error-500: hsl(0, 75%, 55%)
--color-error-600: hsl(0, 70%, 45%)
```
**Uso:** Mensajes de error, validaciones, acciones destructivas

#### Info (Azul claro)
```css
--color-info-500: hsl(200, 75%, 55%)
--color-info-600: hsl(200, 70%, 45%)
```
**Uso:** Mensajes informativos, tooltips

### Colores Neutros

```css
--color-gray-50:  hsl(210, 20%, 98%)  /* Fondos claros */
--color-gray-500: hsl(210, 12%, 50%)  /* Texto secundario */
--color-gray-900: hsl(210, 24%, 12%)  /* Texto principal */
```

### Colores de Texto

```css
--color-text-primary:   /* Títulos, texto importante */
--color-text-secondary: /* Texto normal */
--color-text-tertiary:  /* Texto secundario, placeholders */
--color-text-inverse:   /* Texto sobre fondos oscuros */
```

---

## Tipografía

### Familia de Fuentes

```css
--font-family-base: 'Inter', system-ui, -apple-system, sans-serif;
--font-family-mono: 'Consolas', 'Monaco', monospace;
```

### Pesos de Fuente

```css
--font-weight-light:     300
--font-weight-regular:   400
--font-weight-medium:    500
--font-weight-semibold:  600
--font-weight-bold:      700
--font-weight-extrabold: 800
```

### Tamaños de Fuente

| Variable | Tamaño | Uso |
|----------|--------|-----|
| `--font-size-xs` | 12px | Badges, helpers |
| `--font-size-sm` | 14px | Inputs, botones pequeños |
| `--font-size-base` | 16px | Texto normal |
| `--font-size-lg` | 18px | Subtítulos |
| `--font-size-xl` | 20px | Títulos h4 |
| `--font-size-2xl` | 24px | Títulos h3 |
| `--font-size-3xl` | 30px | Títulos h2 |
| `--font-size-4xl` | 36px | Títulos h1 |
| `--font-size-5xl` | 48px | Héroes, estadísticas |

### Alturas de Línea

```css
--line-height-tight:   1.25  /* Títulos */
--line-height-normal:  1.5   /* Texto normal */
--line-height-relaxed: 1.75  /* Párrafos largos */
```

---

## Espaciado

Sistema de espaciado de 8 puntos (base: 4px).

| Variable | Valor | Uso |
|----------|-------|-----|
| `--spacing-0` | 0 | Reset |
| `--spacing-1` | 4px | Muy ajustado |
| `--spacing-2` | 8px | Compacto |
| `--spacing-3` | 12px | Cómodo |
| `--spacing-4` | 16px | Estándar |
| `--spacing-6` | 24px | Amplio |
| `--spacing-8` | 32px | Muy amplio |
| `--spacing-12` | 48px | Secciones |
| `--spacing-16` | 64px | Grandes separaciones |

**Ejemplo de uso:**
```tsx
<div style={{ padding: 'var(--spacing-6)', marginBottom: 'var(--spacing-8)' }}>
  Content
</div>
```

---

## Componentes

### Button

```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="base">
  Save Changes
</Button>
```

**Props:**
- `variant`: `'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'ghost'`
- `size`: `'sm' | 'base' | 'lg'`
- `fullWidth`: `boolean`
- `disabled`: `boolean`

**Variantes:**

```tsx
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="success">Success</Button>
<Button variant="danger">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui';

<Card>
  <CardHeader>
    <CardTitle>Ticket #1234</CardTitle>
  </CardHeader>
  <CardBody>
    <p>Content goes here...</p>
  </CardBody>
</Card>
```

**Componentes disponibles:**
- `<Card>` - Contenedor principal
- `<CardHeader>` - Encabezado
- `<CardTitle>` - Título
- `<CardDescription>` - Descripción
- `<CardBody>` - Cuerpo
- `<CardFooter>` - Pie

### Badge

```tsx
import { Badge } from '@/components/ui';

<Badge variant="success">Resolved</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Failed</Badge>
```

**Variantes:**
- `primary` - Azul
- `success` - Verde
- `warning` - Amarillo
- `error` - Rojo
- `info` - Azul claro
- `gray` - Gris

### Input

```tsx
import { Input } from '@/components/ui';

<Input
  label="Email"
  type="email"
  placeholder="john@example.com"
  helper="We'll never share your email"
  error="Invalid email address"
/>
```

**Props:**
- `label`: string - Etiqueta del campo
- `error`: string - Mensaje de error
- `helper`: string - Texto de ayuda
- Todos los props estándar de `<input>`

### Textarea

```tsx
import { Textarea } from '@/components/ui';

<Textarea
  label="Description"
  placeholder="Describe the issue..."
  rows={4}
  helper="Provide as much detail as possible"
/>
```

### Select

```tsx
import { Select } from '@/components/ui';

const options = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
];

<Select
  label="Status"
  options={options}
  placeholder="Select status..."
  helper="Current ticket status"
/>
```

### Alert

```tsx
import { Alert } from '@/components/ui';

<Alert variant="success">
  <strong>Success!</strong> Your changes have been saved.
</Alert>

<Alert variant="error">
  <strong>Error!</strong> Something went wrong.
</Alert>
```

**Variantes:**
- `success` - Verde
- `warning` - Amarillo
- `error` - Rojo
- `info` - Azul

---

## Utilidades

### Clases CSS de Utilidad

#### Display
```css
.hidden, .block, .flex, .grid, .inline-flex
```

#### Flexbox
```css
.flex-row, .flex-col
.items-center, .items-start, .items-end
.justify-center, .justify-between, .justify-end
.gap-2, .gap-4, .gap-6
```

#### Texto
```css
.text-left, .text-center, .text-right
.font-medium, .font-semibold, .font-bold
.text-primary, .text-secondary, .text-tertiary
```

#### Espaciado
```css
/* Margins */
.m-0, .m-2, .m-4, .m-6, .m-8
.mt-2, .mt-4, .mb-4, .ml-2, .mr-2

/* Paddings */
.p-0, .p-2, .p-4, .p-6, .p-8
```

#### Ancho
```css
.w-full   /* width: 100% */
.w-auto   /* width: auto */
```

#### Border Radius
```css
.rounded      /* 8px */
.rounded-lg   /* 16px */
.rounded-full /* 9999px */
```

---

## Sombras

```css
--shadow-xs:   /* Muy sutil */
--shadow-sm:   /* Sutil */
--shadow-base: /* Estándar */
--shadow-md:   /* Medio */
--shadow-lg:   /* Grande */
--shadow-xl:   /* Muy grande */
```

**Uso:**
```tsx
<div style={{ boxShadow: 'var(--shadow-md)' }}>
  Content with shadow
</div>
```

---

## Border Radius

```css
--radius-sm:   4px
--radius-base: 8px
--radius-md:   12px
--radius-lg:   16px
--radius-xl:   24px
--radius-2xl:  32px
--radius-full: 9999px
```

---

## Transiciones

```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1)
```

**Uso:**
```css
.my-element {
  transition: all var(--transition-base);
}
```

---

## Modo Oscuro

El sistema soporta automáticamente modo oscuro basado en las preferencias del sistema:

```css
@media (prefers-color-scheme: dark) {
  /* Los colores se ajustan automáticamente */
}
```

Las variables de color cambian automáticamente:
- Fondos: De claros a oscuros
- Texto: De oscuro a claro
- Bordes: Ajustados para contraste

---

## Vista Previa

Para ver todos los componentes en acción, visita:

**[http://localhost:3000/design-system](http://localhost:3000/design-system)**

Esta página muestra:
- Paleta de colores completa
- Todos los componentes con variantes
- Escala de espaciado
- Sombras
- Tipografía
- Ejemplos de uso

---

## Importar Componentes

```tsx
// Importar componentes individuales
import { Button, Card, Badge } from '@/components/ui';

// O importar desde archivos específicos
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
```

---

## Mejores Prácticas

### ✅ Hacer

- Usar variables CSS para colores, espaciado y tipografía
- Importar componentes de `@/components/ui`
- Usar clases de utilidad para layouts simples
- Mantener consistencia con el sistema

### ❌ Evitar

- Hardcodear colores o tamaños (`#3B82F6`, `16px`)
- Crear estilos inline para layouts complejos
- Duplicar componentes existentes
- Mezclar diferentes sistemas de espaciado

---

## Extensión

Para agregar nuevos componentes al Design System:

1. Crear el componente en `src/components/ui/`
2. Exportarlo en `src/components/ui/index.ts`
3. Documentar su uso en este archivo
4. Agregar ejemplos en `/design-system`

---

## Recursos

- **Figma**: [Próximamente]
- **Storybook**: [Próximamente]
- **GitHub**: [Tu repositorio]

---

---

## Página de Estado del Ticket

### Descripción

La página de estado del ticket (`/tickets/status/[id]`) permite a los clientes consultar el estado de sus tickets de forma pública, sin necesidad de autenticación. El diseño prioriza la legibilidad y la accesibilidad.

### Estructura Visual

#### 1. Header (Fondo Claro)
- **Fondo**: `var(--color-primary-50)` - Fondo claro y limpio
- **Borde inferior**: `var(--color-primary-200)` - Separación sutil
- **Tenant Name**: `var(--color-primary-900)` - Texto oscuro, `font-weight: 600`
- **Ticket Title**: `var(--color-gray-900)` - Texto muy oscuro, `font-weight: 700`
- **Icono**: `var(--color-primary-900)` sobre fondo `var(--color-primary-100)`
- **Status Badges**: Fondo `var(--color-primary-100)` con texto `var(--color-primary-900)`

#### 2. ID del Ticket (Fondo Oscuro)
- **Fondo**: `var(--color-gray-900)` - Fondo oscuro para destacar
- **Borde**: `var(--color-gray-800)`
- **Label**: Texto blanco, `font-weight: 700`
- **Valor**: Texto blanco, `font-weight: 700`, fuente monospace

**Razón de diseño**: El ID del ticket es información crítica que debe destacarse. El fondo oscuro con texto blanco crea un contraste máximo y facilita la copia del ID.

#### 3. Descripción (Prioridad Alta)
- **Fondo**: `var(--color-primary-50)` - Fondo claro destacado
- **Borde**: `var(--color-primary-200)`
- **Texto**: `var(--color-gray-900)` - Texto muy oscuro
- **Tamaño**: `var(--font-size-lg)` - Más grande que el texto normal
- **Padding**: `var(--spacing-6)` - Espacio generoso
- **Line-height**: `1.8` - Legibilidad mejorada

**Razón de diseño**: La descripción es la información más importante para el cliente. Se destaca visualmente con fondo claro, texto grande y espaciado amplio.

#### 4. Información Secundaria (Asignado, Creado, Actualizado)
- **Fondo**: `var(--color-gray-50)` - Fondo muy sutil
- **Borde**: `var(--color-gray-200)`
- **Labels**: `var(--color-gray-500)` - Texto claro y discreto, `font-weight: 500`
- **Valores**: `var(--color-gray-900)` - Texto oscuro y legible, `font-weight: 600`
- **Padding**: `var(--spacing-3)` - Compacto

**Razón de diseño**: Esta información es secundaria pero útil. Se presenta de forma discreta pero legible, sin competir con la descripción.

#### 5. Alert de Ayuda
- **Fondo**: `var(--color-info-50)` - Fondo claro informativo
- **Borde**: `var(--color-info-200)`
- **Texto**: `var(--color-info-800)` - Texto oscuro legible
- **Texto en negrita**: `var(--color-info-900)` - Máximo contraste

### Principios de Contraste

Todos los elementos cumplen con **WCAG AA** (mínimo 4.5:1 para texto normal, 3:1 para texto grande):

| Elemento | Fondo | Texto | Contraste |
|----------|-------|-------|-----------|
| Header - Tenant | primary-50 | primary-900 | ✅ Excelente |
| Header - Title | primary-50 | gray-900 | ✅ Excelente |
| Status Badges | primary-100 | primary-900 | ✅ Excelente |
| ID Label | gray-900 | white | ✅ Excelente |
| ID Value | gray-900 | white | ✅ Excelente |
| Description | primary-50 | gray-900 | ✅ Excelente |
| Info Labels | gray-50 | gray-500 | ✅ Bueno |
| Info Values | gray-50 | gray-900 | ✅ Excelente |
| Help Alert | info-50 | info-800 | ✅ Excelente |

### Jerarquía Visual

1. **Nivel 1 - Máxima Prioridad**: Descripción del ticket
2. **Nivel 2 - Alta Prioridad**: ID del ticket (fondo oscuro)
3. **Nivel 3 - Media Prioridad**: Título y estado del ticket
4. **Nivel 4 - Baja Prioridad**: Información secundaria (fechas, asignado)

### Responsive Design

- **Desktop**: Layout completo con grid de 3 columnas para información secundaria
- **Tablet** (≤768px): Grid de 1 columna, padding reducido
- **Mobile** (≤480px): Títulos más pequeños, iconos ajustados

### Animaciones

- **Fade In**: Entrada suave de la página (0.4s)
- **Slide Up**: Aparición de la tarjeta principal (0.5s)
- **Card Appear**: Escala suave de la tarjeta (0.6s)
- **Hover**: Transiciones suaves en elementos interactivos

### Archivos Relacionados

- **Componente**: `src/components/tickets/TicketStatusCard.tsx`
- **Estilos**: `src/components/tickets/TicketStatusCard.module.css`
- **Página**: `src/app/tickets/status/[id]/page.tsx`
- **Loading**: `src/app/tickets/status/[id]/loading.tsx`
- **Not Found**: `src/app/tickets/status/[id]/not-found.tsx`

### Mejores Prácticas

1. ✅ **Contraste Sutil y aveces maximo**: Textos oscuros sobre fondos claros, textos blancos sobre fondos oscuros
2. ✅ **Jerarquía clara**: La descripción siempre tiene más peso visual
3. ✅ **Información secundaria discreta**: Labels en gris claro, valores en gris oscuro
4. ✅ **ID destacado**: Fondo oscuro para facilitar la copia del ID
5. ✅ **Accesibilidad**: Todos los contrastes cumplen WCAG AA

---

**Versión**: 1.0.0
**Última actualización**: Diciembre 2025
