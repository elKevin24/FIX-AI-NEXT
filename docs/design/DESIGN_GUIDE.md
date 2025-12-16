# Guía de Diseño - FIX-AI-NEXT

**Versión:** 1.0  
**Fecha:** 2025-12-15  
**Estado:** Activo

---

## 🎨 Principios de Diseño

### 1. Minimalismo y Sobriedad
- **Menos es más:** Evitar elementos decorativos innecesarios
- **Espacios con propósito:** Cada espacio debe tener una función clara
- **Jerarquía visual clara:** Usar tamaños de fuente y weights para guiar la atención

### 2. Consistencia

Todos los componentes deben seguir los mismos patrones establecidos en el Design System.

---

## 📏 Reglas Globales de Diseño

### ❌ Prohibido

1. **Texto subrayado (`text-decoration: underline`)**
   - Regla establecida en `globals.css`
   - Los enlaces NO deben tener subrayado ni en estado normal ni en hover
   - Usar color y/o background para indicar interactividad

2. **Gradientes excesivos**
   - Evitar gradientes decorativos en backgrounds
   - Solo usar gradientes sutiles cuando aporten valor funcional

3. **Animaciones exageradas**
   - No usar animaciones que distraigan
   - No usar `transform: scale()` salvo casos excepcionales
   - No usar pulse infinito salvo para indicators críticos

4. **Sombras excesivas**
   - No usar `box-shadow` con valores mayores a `var(--shadow-lg)`
   - Evitar sombras de colores (usar solo grises)

### ✅ Recomendado

1. **Transiciones sutiles**
   ```css
   transition: all var(--transition-fast); /* 150ms */
   transition: background var(--transition-base); /* 250ms */
   ```

2. **Hover states minimalistas**
   ```css
   .element:hover {
       background: var(--color-surface-hover);
       border-color: var(--color-border-strong);
   }
   ```

3. **Focus visible para accesibilidad**
   ```css
   .element:focus-visible {
       outline: 2px solid var(--color-primary-600);
       outline-offset: 2px;
   }
   ```

---

## 🧩 Patrones Establecidos

### Pattern 1: Search Input + Button

**Origen:** `/tickets/status`  
**Componente:** `SearchInputGroup`

```tsx
import { SearchInputGroup } from '@/components/ui';

<SearchInputGroup
    value={searchTerm}
    onChange={setSearchTerm}
    onSearch={handleSearch}
    placeholder="Buscar..."
    buttonText="Buscar"
    isLoading={loading}
    error={hasError}
/>
```

**Características:**
- Input y botón integrados en un contenedor
- Border compartido que cambia en focus
- Botón con border-radius interno
- Sin separación visual entre input y botón
- Responsive: stack vertical en mobile

**CSS:**
```css
.searchGroup {
    display: flex;
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-lg); /* 1rem */
    overflow: hidden;
}

.searchInput {
    flex: 1;
    border: none;
    padding: 0.625rem 1rem;
}

.searchButton {
    border-radius: 0.75rem;
    margin: 0.25rem;
    padding: 0.625rem 1.25rem;
}
```

---

### Pattern 2: Botón Link (Sin Subrayado)

**Aplicación:** Links que parecen botones

```css
.linkButton {
    display: inline-flex;
    padding: 0.375rem 0.75rem;
    background: var(--color-surface-hover);
    color: var(--color-primary-600);
    text-decoration: none; /* ← Importante */
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border-medium);
}

.linkButton:hover {
    background: var(--color-primary-50);
    border-color: var(--color-primary-600);
    text-decoration: none; /* ← Importante */
}
```

---

### Pattern 3: Tabla Minimalista

**Características:**
- Header con background sutil: `var(--color-bg-secondary)`
- Rows con hover: `var(--color-surface-hover)`
- Padding compacto: `0.875rem 1.25rem`
- Border bottom entre filas: `1px solid var(--color-border-light)`

```css
.table {
    width: 100%;
    border-collapse: collapse;
}

.table thead {
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border-medium);
}

.table th {
    padding: 0.75rem 1.25rem;
    font-weight: 600;
    font-size: 0.6875rem; /* 11px */
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.table td {
    padding: 0.875rem 1.25rem;
    font-size: 0.875rem;
}

.table tbody tr:hover {
    background: var(--color-surface-hover);
}
```

---

### Pattern 4: Status Badges

**Características:**
- Sin gradientes: colores planos
- Sin borders decorativos
- Border-radius small: `var(--radius-sm)`
- Tamaño de fuente pequeño: `0.6875rem`

```css
.badge {
    display: inline-flex;
    padding: 0.25rem 0.625rem;
    border-radius: var(--radius-sm);
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.badge.success {
    background: var(--color-success-100);
    color: var(--color-success-700);
}
```

---

## 📐 Espaciado y Márgenes

### Grupos de Controles
```css
.controlGroup {
    display: flex;
    gap: 0.5rem; /* Para elementos relacionados */
    align-items: center;
}
```

### Secciones de Página
```css
.section {
    margin-bottom: 1.25rem; /* Entre secciones */
}

.container {
    gap: 1.25rem; /* Entre elementos principales */
}
```

### Padding en Contenedores
```css
.card {
    padding: 1rem; /* Compacto */
}

.modal {
    padding: 1.5rem; /* Mayor importancia */
}
```

---

## 🎯 UX/UI Best Practices

### 1. Feedback Visual Inmediato
- Cambios de background en hover
- Border color en focus
- Estados de loading claros

### 2. Jerarquía de Contenido
```
h1: 1.75rem, weight 700  (Títulos principales)
h2: 1.5rem, weight 600   (Subtítulos)
Body: 0.875rem           (Texto general)
Small: 0.75rem           (Metadata, labels)
```

### 3. Densidad de Información
- **Tables:** Compactas pero legibles (0.875rem font)
- **Forms:** Espaciosas para facilitar input (1rem padding min)
- **Cards:** Balance entre contenido y aire

### 4. Estados de Elementos

**Todos los elementos interactivos deben tener:**
```css
/* Normal */
.element { }

/* Hover */
.element:hover { }

/* Focus (para teclado) */
.element:focus-visible { }

/* Disabled */
.element:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
```

---

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile first */
@media (max-width: 640px) { }  /* Mobile */
@media (max-width: 768px) { }  /* Tablet */
@media (min-width: 1024px) { } /* Desktop */
```

### Patrones Responsive

**Flex to Stack:**
```css
.row {
    display: flex;
    gap: 0.75rem;
}

@media (max-width: 768px) {
    .row {
        flex-direction: column;
    }
}
```

**Grid Auto-fit:**
```css
.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
}
```

---

## ✅ Checklist de Diseño

Antes de considerar un componente "terminado":

- [ ] Sin text-decoration underline
- [ ] Transiciones suaves (≤250ms)
- [ ] Estados hover/focus definidos
- [ ] Responsive en mobile
- [ ] Usa variables del design system
- [ ] Padding/margins consistentes
- [ ] Font sizes apropiados
- [ ] Contraste WCAG AA cumplido

---

## 📚 Recursos

- **Design System:** `src/app/globals.css`
- **Componentes UI:** `src/components/ui/`
- **Patrones:** Este documento
- **Temas:** `docs/design/themes/`

---

**Última actualización:** 2025-12-15  
**Mantenedor:** Equipo Frontendd  
**Estado:** ✅ Activo
