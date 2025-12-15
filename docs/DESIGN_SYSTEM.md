# Design System - FIX-AI-NEXT

## Filosofía de Diseño

Basado en la página `/dashboard/tickets/create`, nuestro design system sigue estos principios:

### 1. **Glass Morphism (Glassmorfismo)**
- Cards con fondo semi-transparente
- `backdrop-filter: blur(8px)` para efecto de vidrio esmerilado
- Se adapta perfectamente a los temas dark/light

### 2. **Fondos Sutiles Animados**
- Blobs de colores suaves en el fondo
- Animación pulse lenta (15s)
- Opacidad muy baja (0.15) para no distraer
- Colores variables según el tema

### 3. **Minimalismo y Espaciado Compacto**
- Padding reducido (0.75rem en cards)
- Gaps pequeños (0.5rem)
- Bordes redondeados suaves (0.625rem)

### 4. **Jerarquía Visual Clara**
- Títulos con `letter-spacing: -0.02em` para look moderno
- Iconos con fondos de gradiente del color primario
- Números y badges con fondos sutiles

## Componentes del Design System

### Glass Card

```css
.glassCard {
    background: var(--color-surface);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid var(--color-border-light);
    border-radius: 0.625rem;
    padding: 0.75rem;
    box-shadow: var(--shadow-sm);
    transition: all 0.2s ease;
}

.glassCard:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--color-border-medium);
}
```

**Cuándo usar:**
- Cards de contenido principal
- Formularios
- Secciones de información

### Icon Circle

```css
.iconCircle {
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 0.375rem;
    background: linear-gradient(135deg, var(--color-primary-100), var(--color-primary-200));
    color: var(--color-primary-600);
    display: flex;
    align-items: center;
    justify-content: center;
}
```

**Cuándo usar:**
- Headers de secciones
- Indicadores de categorías
- Estados visuales

### Success Indicator (Customer Selected Style)

```css
.successIndicator {
    padding: 0.625rem;
    background: linear-gradient(135deg, var(--color-success-50), var(--color-success-100));
    border: 1px solid var(--color-success-500);
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.625rem;
}
```

**Cuándo usar:**
- Confirmaciones
- Selecciones exitosas
- Estados positivos

### Badge/Counter

```css
.badge {
    background: var(--color-gray-200);
    padding: 0.125rem 0.5rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-text-secondary);
}
```

**Cuándo usar:**
- Contadores
- Tags
- Números de elementos

### Remove/Delete Button

```css
.removeBtn {
    color: var(--color-gray-400);
    background: transparent;
    border: none;
    padding: 0.125rem;
    cursor: pointer;
    transition: all 0.2s;
    border-radius: 0.25rem;
}

.removeBtn:hover {
    color: var(--color-error-600);
    background-color: var(--color-error-50);
}
```

**Cuándo usar:**
- Eliminación de items
- Cerrar modales
- Acciones destructivas secundarias

### Primary Action Button

```css
.primaryBtn {
    padding: 0.75rem 1.5rem;
    font-size: 0.9rem;
    font-weight: 600;
    border-radius: 0.625rem;
    box-shadow: var(--shadow-base);
    transition: all 0.2s ease;
}

.primaryBtn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: var(--shadow-lg);
}
```

**Cuándo usar:**
- Acciones principales
- Submit de formularios
- CTAs importantes

### Background Blobs

```css
.backgroundEffects {
    position: fixed;
    inset: 0;
    z-index: -10;
    background-color: var(--color-bg-primary);
    overflow: hidden;
}

.blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(120px);
    opacity: 0.15;
    animation: pulse 15s infinite alternate;
}

.blobBlue {
    background-color: var(--color-primary-100);
    /* positioning... */
}

.blobPurple {
    background-color: var(--color-secondary-100);
    /* positioning... */
}

.blobEmerald {
    background-color: var(--color-success-100);
    /* positioning... */
}
```

**Cuándo usar:**
- Páginas principales
- Fondos de formularios
- Landing pages internas

## Animaciones

### Slide Up (Entrada de elementos)
```css
@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
```

### Fade In (Aparición suave)
```css
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
```

### Pulse (Respiración suave)
```css
@keyframes pulse {
    0% { transform: scale(1); }
    100% { transform: scale(1.1); }
}
```

## Responsive Design

### Mobile First
- Layouts en columna única
- Padding reducido (0.5rem)
- Font-sizes más pequeños

### Desktop (768px+)
- Grid de 2-3 columnas
- Padding aumentado (1rem - 1.5rem)
- Font-sizes más grandes
- Alineación horizontal en lugar de vertical

## Paleta de Colores por Tema

Todos los componentes usan variables CSS que cambian automáticamente según el tema:

- `--color-surface`: Fondo de cards
- `--color-border-light`: Bordes sutiles
- `--color-border-medium`: Bordes normales
- `--color-text-primary`: Texto principal
- `--color-text-secondary`: Texto secundario
- `--color-primary-*`: Colores de marca
- `--color-success-*`: Estados positivos
- `--color-error-*`: Estados negativos/destructivos
- `--shadow-*`: Sombras adaptadas al tema

## Mejores Prácticas

1. **Siempre usar variables CSS** en lugar de colores hardcodeados
2. **Aplicar glassmorphism** en cards principales para consistencia
3. **Usar animaciones sutiles** (0.2s - 0.3s) para feedback
4. **Mantener el spacing compacto** pero respirable
5. **Gradientes solo en elementos pequeños** (iconos, indicadores)
6. **Fondos animados solo en páginas principales**
7. **Sticky footers** para acciones importantes (max 40vh de viewport)

## Ejemplos de Uso

### Card Simple
```jsx
<div className={styles.glassCard}>
    <div className={styles.cardHeader}>
        <div className={styles.iconCircle}>
            📋
        </div>
        <h3 className={styles.cardTitle}>Información</h3>
    </div>
    <div className={styles.cardBody}>
        {/* Contenido */}
    </div>
</div>
```

### Página con Fondo
```jsx
<div className={styles.container}>
    <div className={styles.backgroundEffects}>
        <div className={`${styles.blob} ${styles.blobBlue}`} />
        <div className={`${styles.blob} ${styles.blobPurple}`} />
        <div className={`${styles.blob} ${styles.blobEmerald}`} />
    </div>
    <div className={styles.content}>
        {/* contenido principal */}
    </div>
</div>
```

---

**Última actualización:** 2025-12-14  
**Versión:** 1.0  
