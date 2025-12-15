# Sistema de Temas - FIX-AI-NEXT

## Descripción General

El proyecto implementa un sistema completo de temas con tres opciones:

1. **Light** - Tema claro predeterminado
2. **Dark** - Tema oscuro moderno con alto contraste
3. **Dark Colorblind** - Tema oscuro optimizado para daltonismo (similar a GitHub Dark Colorblind)

## Características

### Temas Disponibles

#### Light Mode
- Fondo claro con colores vibrantes
- Diseño profesional estándar
- Textos oscuros sobre fondos claros

#### Dark Mode
- Fondos oscuros con grises fríos
- Colores más brillantes para mejorar la visibilidad
- Sombras más pronunciadas
- Alto contraste para lectura cómoda

#### Dark Colorblind Mode
- **Verde → Azul**: En lugar de verde para éxito, usa azul
- **Rojo → Naranja**: En lugar de rojo para errores, usa naranja
- **Advertencias en amarillo brillante** para máxima visibilidad
- **Info en cian** para distinguirse del azul primario

## Arquitectura Técnica

### 1. Variables CSS (`globals.css`)

Todas las variables de color se definen en `:root` para el tema light y en selectores `[data-theme="dark"]` y `[data-theme="dark-colorblind"]` para los temas oscuros.

```css
:root {
  --color-bg-primary: /* Light background */
  --color-text-primary: /* Dark text */
  /* ... más variables */
}

[data-theme="dark"] {
  --color-bg-primary: /* Dark background */
  --color-text-primary: /* Light text */
  /* ... más variables */
}

[data-theme="dark-colorblind"] {
  /* Colores optimizados para daltonismo */
  --color-success-500: hsl(210, 80%, 55%); /* AZUL en lugar de verde */
  --color-error-500: hsl(25, 90%, 60%); /* NARANJA en lugar de rojo */
}
```

### 2. ThemeContext (`src/contexts/ThemeContext.tsx`)

Provider de React que:
- Gestiona el estado del tema actual
- Proporciona función `setTheme()` para cambiar temas
- Persiste la selección en `localStorage`
- Lee el tema inicial del DOM (establecido por script bloqueante)

### 3. Script de Bloqueo (`layout.tsx`)

Script inline que se ejecuta **antes** de la hidratación de React para:
- Prevenir el "flash of unstyled content"
- Leer el tema de `localStorage`
- Aplicar el atributo `data-theme` al `<html>` inmediatamente

### 4. ThemeSwitcher Component (`src/components/ui/ThemeSwitcher.tsx`)

Dropdown interactivo que:
- Muestra el tema actual con icono
- Lista todos los temas disponibles
- Cambia el tema al hacer clic
- Incluye animaciones suaves

## Ubicaciones del ThemeSwitcher

El componente ThemeSwitcher está disponible en:

1. **Dashboard** - En el Sidebar, encima del botón de logout
2. **Página de Consulta de Tickets** (`/tickets/status`) - En la navbar superior

## Uso

### Para el Usuario

1. Hacer clic en el botón del tema actual (muestra icono y nombre)
2. Seleccionar el tema deseado del dropdown
3. El cambio se aplica instantáneamente
4. La selección se guarda automáticamente

### Para Desarrolladores

#### Usar Variables CSS en Componentes

```css
.myComponent {
  background: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-medium);
}
```

#### Acceder al Tema en React

```tsx
import { useTheme } from '@/contexts/ThemeContext';

function MyComponent() {
  const { theme, setTheme } = useTheme();
  
  return (
    <button onClick={() => setTheme('dark')}>
      Current: {theme}
    </button>
  );
}
```

#### Agregar un Nuevo Tema

1. Definir variables en `globals.css`:
```css
[data-theme="mi-nuevo-tema"] {
  --color-bg-primary: ...;
  --color-text-primary: ...;
  /* ... todas las variables requeridas */
}
```

2. Actualizar el tipo en `ThemeContext.tsx`:
```tsx
export type Theme = 'light' | 'dark' | 'dark-colorblind' | 'mi-nuevo-tema';
```

3. Agregar a la lista en `ThemeSwitcher.tsx`:
```tsx
const themes = [
  /* ... temas existentes */
  { value: 'mi-nuevo-tema', label: 'Mi Nuevo Tema', icon: '🎨' },
];
```

## Variables CSS Principales

### Backgrounds
- `--color-bg-primary` - Fondo principal de la página
- `--color-bg-secondary` - Fondo secundario
- `--color-surface` - Superficie de cards/contenedores
- `--color-surface-hover` - Estado hover de superficies

### Text
- `--color-text-primary` - Texto principal
- `--color-text-secondary` - Texto secundario
- `--color-text-tertiary` - Texto terciario/menos importante

### Borders
- `--color-border-light` - Bordes sutiles
- `--color-border-medium` - Bordes estándar
- `--color-border-strong` - Bordes activos/enfocados

### Semantic Colors
- `--color-success-*` - Verde (light/dark) / Azul (colorblind)
- `--color-warning-*` - Amarillo/Ámbar
- `--color-error-*` - Rojo (light/dark) / Naranja (colorblind)
- `--color-info-*` - Azul/Cyan
- `--color-primary-*` - Color primario de la marca

### Shadows
- `--shadow-xs` a `--shadow-xl` - Sombras adaptadas al tema

## Consideraciones de Accesibilidad

1. **Alto Contraste**: Todos los colores cumplen con WCAG AA/AAA
2. **Colorblind Mode**: Evita rojo/verde para usuarios daltónicos
3. **No Flash**: Script de bloqueo previene parpadeo al cargar
4. **Persistencia**: Guarda la preferencia del usuario

## Archivos Modificados

- `src/app/globals.css` - Variables de temas
- `src/app/layout.tsx` - Script de prevención de flash
- `src/contexts/ThemeContext.tsx` - Gestión de estado
- `src/components/ui/ThemeSwitcher.tsx` - Componente de cambio
- `src/components/ui/ThemeSwitcher.module.css` - Estilos del switcher
- `src/components/dashboard/Sidebar.tsx` - Integración en dashboard
- `src/components/dashboard/Sidebar.module.css` - Estilos adaptados
- `src/app/tickets/status/TicketSearchClient.tsx` - Integración en página pública

## Mejoras Futuras

- [ ] Detectar preferencia del sistema (`prefers-color-scheme`)
- [ ] Más temas (Sepia, High Contrast, etc.)
- [ ] Opciones de personalización por usuario
- [ ] Modo de contraste extra alto
- [ ] Tema seasonal/festivo
