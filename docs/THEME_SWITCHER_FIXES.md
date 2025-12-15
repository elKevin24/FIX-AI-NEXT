## Correcciones al ThemeSwitcher

### Problemas identificados y solucionados:

1. **Z-index muy bajo**: Aumentado de 1000 a 99999
2. **Overflow hidden**: Cambiado a `visible` para que las opciones se muestren
3. **Clipping del contenedor padre**: Agregado `overflow: visible` a `.themeSwitcherWrapper`
4. **Sidebar cortaba el dropdown**: Agregado `overflow-y: auto` y `overflow-x: visible` al sidebar
5. **Posicionamiento**: Cambiado el dropdown para que se muestre **hacia arriba** (bottom) en lugar de hacia abajo (top), ya que está en la parte inferior del sidebar

### Cambios realizados:

**ThemeSwitcher.module.css:**
- `bottom: calc(100% + var(--spacing-1))` en lugar de `top`
- `z-index: 99999` en lugar de `var(--z-dropdown)`
- `overflow: visible`
- Animación `slideUp` en lugar de `slideDown`

**Sidebar.module.css:**
- `.themeSwitcherWrapper`: agregado `position: relative`, `overflow: visible`, `z-index: 100`
- `.sidebar`: agregado `overflow-y: auto` y `overflow-x: visible`

El dropdown ahora debería:
- Mostrarse completamente visible
- Aparecer encima del botón (hacia arriba)
- No ser cortado por los contenedores padres
- Tener suficiente z-index para estar sobre todos los demás elementos
