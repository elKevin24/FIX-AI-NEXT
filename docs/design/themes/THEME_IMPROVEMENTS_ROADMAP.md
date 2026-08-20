# Roadmap de Mejoras del Sistema de Temas

## 🎯 Objetivo
Elevar el sistema de temas de **8.5/10 → 9.5/10** implementando mejoras de accesibilidad, UX y performance.

---

## 🔴 Fase 1: Mejoras Críticas de Accesibilidad (Alta Prioridad)

### 1.1 Implementar `prefers-reduced-motion`
**Impacto:** 🔴 Crítico - WCAG 2.1 Level AA (Success Criterion 2.3.3)  
**Estimación:** 2 horas  
**Archivos afectados:**
- `src/app/globals.css`
- Todos los archivos `.module.css` con animaciones

**Implementación:**
```css
/* En globals.css - Al final del archivo */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  
  /* Deshabilitar animaciones de blobs */
  .blob {
    animation: none !important;
  }
}
```

**Testing:**
- Chrome DevTools > Rendering > Emulate CSS media feature `prefers-reduced-motion`
- Verificar que todas las animaciones se desactivan

---

### 1.2 Mejorar Navegación por Teclado en ThemeSwitcher
**Impacto:** 🔴 Crítico - WCAG 2.1 Level A (Success Criterion 2.1.1)  
**Estimación:** 3 horas  
**Archivos afectados:**
- `src/components/ui/ThemeSwitcher.tsx`
- `src/components/ui/ThemeSwitcher.module.css`

**Implementación:**
```tsx
// ThemeSwitcher.tsx - Agregar manejo de teclado
const [focusedIndex, setFocusedIndex] = useState(0);

const handleKeyDown = (e: React.KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setFocusedIndex((prev) => 
        prev < themes.length - 1 ? prev + 1 : 0
      );
      break;
    case 'ArrowUp':
      e.preventDefault();
      setFocusedIndex((prev) => 
        prev > 0 ? prev - 1 : themes.length - 1
      );
      break;
    case 'Enter':
    case ' ':
      e.preventDefault();
      setTheme(themes[focusedIndex].value);
      setIsOpen(false);
      break;
    case 'Escape':
      e.preventDefault();
      setIsOpen(false);
      break;
  }
};

// En el botón principal
<button
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  }}
  // ... resto de props
>

// En el dropdown
<div 
  role="menu" 
  aria-orientation="vertical"
  onKeyDown={handleKeyDown}
  className={styles.dropdown}
>
  {themes.map((t, index) => (
    <button
      key={t.value}
      role="menuitem"
      tabIndex={focusedIndex === index ? 0 : -1}
      ref={focusedIndex === index ? focusedButtonRef : null}
      // ... resto de props
    >
  ))}
</div>
```

**Testing checklist:**
- [ ] Arrow Up/Down navega entre opciones
- [ ] Enter/Space selecciona tema
- [ ] Escape cierra el dropdown
- [ ] Tab sale del componente
- [ ] Focus visible en la opción activa

---

### 1.3 Anuncios para Screen Readers
**Impacto:** 🟡 Alto - Mejora experiencia de usuarios con lectores de pantalla  
**Estimación:** 1 hora  
**Archivos afectados:**
- `src/components/ui/ThemeSwitcher.tsx`
- `src/app/globals.css` (agregar clase `.sr-only`)

**Implementación:**
```tsx
// ThemeSwitcher.tsx
const [announcement, setAnnouncement] = useState('');

const handleThemeChange = (newTheme: Theme) => {
  const themeLabel = themes.find(t => t.value === newTheme)?.label;
  setTheme(newTheme);
  setAnnouncement(`Tema cambiado a ${themeLabel}`);
  setIsOpen(false);
  
  // Limpiar anuncio después de 3 segundos
  setTimeout(() => setAnnouncement(''), 3000);
};

// En el JSX
return (
  <>
    <div className={styles.themeSwitcher} ref={dropdownRef}>
      {/* ... componente existente ... */}
    </div>
    
    {/* Anuncio para screen readers */}
    <div 
      role="status" 
      aria-live="polite" 
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  </>
);
```

```css
/* En globals.css - Agregar clase sr-only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

## 🟡 Fase 2: Mejoras de UX (Media Prioridad)

### 2.1 Detección Automática de `prefers-color-scheme`
**Impacto:** 🟡 Alto - UX esperada por usuarios  
**Estimación:** 4 horas  
**Archivos afectados:**
- `src/contexts/ThemeContext.tsx`
- `src/components/ui/ThemeSwitcher.tsx`
- `src/app/layout.tsx`

**Implementación:**
```typescript
// ThemeContext.tsx
export type Theme = 'light' | 'dark' | 'dark-colorblind' | 'auto';

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? 'dark' 
      : 'light';
  }
  return 'light';
};

const resolveTheme = (theme: Theme): 'light' | 'dark' | 'dark-colorblind' => {
  if (theme === 'auto') {
    return getSystemTheme();
  }
  return theme;
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme') as Theme | null;
      if (saved && ['light', 'dark', 'dark-colorblind', 'auto'].includes(saved)) {
        return saved;
      }
    }
    return 'auto'; // Default a auto
  });
  
  // Escuchar cambios en preferencias del sistema
  useEffect(() => {
    if (theme !== 'auto') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const resolved = resolveTheme('auto');
      document.documentElement.setAttribute('data-theme', resolved);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);
  
  // Aplicar tema resuelto
  useEffect(() => {
    const resolved = resolveTheme(theme);
    document.documentElement.setAttribute('data-theme', resolved);
  }, [theme]);
  
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    const resolved = resolveTheme(newTheme);
    document.documentElement.setAttribute('data-theme', resolved);
  };
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

```tsx
// ThemeSwitcher.tsx - Agregar opción "Auto"
const themes: { value: Theme; label: string; icon: string }[] = [
  { value: 'auto', label: 'Auto (Sistema)', icon: '🌓' },
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'dark-colorblind', label: 'Dark Colorblind', icon: '👁️' },
];
```

```html
<!-- layout.tsx - Actualizar blocking script -->
<script dangerouslySetInnerHTML={{ __html: `
  (function() {
    try {
      const theme = localStorage.getItem('theme') || 'auto';
      
      if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      } else if (['light', 'dark', 'dark-colorblind'].includes(theme)) {
        document.documentElement.setAttribute('data-theme', theme);
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } catch (e) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();
` }} />
```

---

### 2.2 Sincronización entre Pestañas
**Impacto:** 🟡 Medio - Mejora consistencia  
**Estimación:** 2 horas  
**Archivos afectados:**
- `src/contexts/ThemeContext.tsx`

**Implementación:**
```typescript
// ThemeContext.tsx - Agregar listener de storage
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'theme' && e.newValue) {
      const newTheme = e.newValue as Theme;
      if (['light', 'dark', 'dark-colorblind', 'auto'].includes(newTheme)) {
        setThemeState(newTheme);
        const resolved = resolveTheme(newTheme);
        document.documentElement.setAttribute('data-theme', resolved);
      }
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);
```

---

### 2.3 Fallback para `backdrop-filter`
**Impacto:** 🟢 Bajo - Compatibilidad con navegadores antiguos  
**Estimación:** 1 hora  
**Archivos afectados:**
- `src/app/globals.css`
- Archivos `.module.css` con glassmorphism

**Implementación:**
```css
/* Pattern para todos los glass elements */
.glassCard {
    background: var(--color-surface);
    
    /* Fallback para navegadores sin backdrop-filter */
    @supports not (backdrop-filter: blur(8px)) {
        background: rgba(255, 255, 255, 0.95);
    }
    
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-lg);
}

/* Para dark theme */
[data-theme="dark"] .glassCard {
    @supports not (backdrop-filter: blur(8px)) {
        background: rgba(30, 30, 35, 0.95);
    }
}
```

---

## 🟢 Fase 3: Mejoras Avanzadas (Baja Prioridad)

### 3.1 Soporte para `prefers-contrast` ✅ (2026-08-19)
**Impacto:** 🟢 Bajo - Accesibilidad adicional  
**Estimación:** 3 horas

```css
/* globals.css */
@media (prefers-contrast: high) {
  :root {
    --color-border-medium: var(--color-gray-600);
    --color-border-strong: var(--color-gray-800);
  }
  
  [data-theme="dark"] {
    --color-text-primary: hsl(0, 0%, 100%);
    --color-text-secondary: hsl(0, 0%, 95%);
  }
}
```

---

### 3.2 Theme Preview
**Impacto:** 🟢 Bajo - Nice to have  
**Estimación:** 4 horas

Pequeña preview del tema al hacer hover en ThemeSwitcher antes de seleccionar.

---

### 3.3 Persistencia en Base de Datos
**Impacto:** 🟢 Bajo - Para usuarios autenticados  
**Estimación:** 6 horas

Guardar preferencia de tema en la tabla `User` y sincronizar.

---

## 📅 Timeline Sugerido

### Sprint 1 (1 semana)
- ✅ Fase 1.1: `prefers-reduced-motion` (2h)
- ✅ Fase 1.2: Navegación por teclado (3h)
- ✅ Fase 1.3: Screen reader announcements (1h)
- ✅ Fase 2.3: Fallback backdrop-filter (1h)

**Total:** 7 horas  
**Resultado esperado:** 8.5/10 → 9.0/10

---

### Sprint 2 (1 semana)
- ✅ Fase 2.1: Auto theme (4h)
- ✅ Fase 2.2: Sincronización entre tabs (2h)
- ✅ Testing exhaustivo (2h)
- ✅ Documentación actualizada (1h)

**Total:** 9 horas  
**Resultado esperado:** 9.0/10 → 9.5/10

---

### Backlog
- ✅ Fase 3.1: `prefers-contrast` (2026-08-19)
- 🔮 Fase 3.2: Theme preview
- 🔮 Fase 3.3: DB persistence

---

## 🧪 Plan de Testing

### Tests Manuales
- [ ] Cambio de tema funciona en todos los navegadores
- [ ] FOUC no ocurre en ninguna condición
- [ ] Navegación por teclado completa
- [ ] Screen reader anuncia cambios
- [ ] `prefers-reduced-motion` respetado
- [ ] `prefers-color-scheme` detectado correctamente
- [ ] Sincronización entre pestañas funciona
- [ ] Fallbacks de backdrop-filter funcionan en Firefox 90-

### Tests Automatizados (Opcional)
```typescript
// __tests__/ThemeContext.test.tsx
describe('ThemeContext', () => {
  it('should respect prefers-color-scheme when auto', () => {
    // Mock matchMedia
    // Test que retorna dark cuando sistema está en dark
  });
  
  it('should sync across tabs', () => {
    // Simular StorageEvent
    // Verificar que tema cambia
  });
});
```

---

## 📊 KPIs de Éxito

### Métricas Técnicas
- [ ] Calificación: 8.5 → 9.5
- [ ] WCAG Level: AA → AAA (donde sea posible)
- [ ] Keyboard navigation score: 60% → 100%
- [ ] Screen reader compatibility: 70% → 95%

### Métricas de Usuario
- [ ] 0 quejas de accesibilidad en feedback
- [ ] 95%+ usuarios satisfechos con temas
- [ ] 0 reports de FOUC
- [ ] 0 reports de animaciones molestas

---

## 🎓 Recursos de Referencia

### WCAG Guidelines
- [2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)
- [2.1.1 Keyboard](https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html)
- [1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)

### Best Practices
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [MDN: prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
- [Josh Comeau: Dark Mode](https://www.joshwcomeau.com/react/dark-mode/)

---

## ✅ Checklist de Implementación

- [ ] Fase 1.1 implementada y testeada
- [ ] Fase 1.2 implementada y testeada
- [ ] Fase 1.3 implementada y testeada
- [ ] Fase 2.1 implementada y testeada
- [ ] Fase 2.2 implementada y testeada
- [ ] Fase 2.3 implementada y testeada
- [ ] Tests manuales completados
- [ ] Documentación actualizada
- [ ] THEME_SYSTEM_EVALUATION.md actualizado con nueva puntuación
- [ ] PR creado y revisado
- [ ] Deployment a producción

---

**Última actualización:** 2025-12-15  
**Owner:** Equipo Frontend  
**Revisor:** Tech Lead
