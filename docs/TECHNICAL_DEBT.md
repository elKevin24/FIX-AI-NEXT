# 🛠 Deuda Técnica y Mejoras de UX/UI

Este archivo registra los problemas detectados por auditorías automáticas (Lighthouse) que deben ser resueltos para alcanzar los estándares de calidad del proyecto.

## 🔴 Prioridad Alta: Errores de Consola
- **Problema:** Lighthouse detectó errores de ejecución de JS al cargar la página principal.
- **Impacto:** Posibles fallos en la interactividad del usuario.
- **Tarea:** Depurar 'app/page.tsx' y componentes globales para eliminar errores de consola.

## 🟠 Prioridad Media: Accesibilidad (Contraste)
- **Problema:** Fallo en la regla 'color-contrast'.
- **Impacto:** Usuarios con visión reducida o en entornos con mucha luz no pueden leer el contenido.
- **Tarea:** Revisar 'design-system.css' y variables de color para cumplir con el estándar WCAG AA.

## 🟡 Prioridad Baja: Rendimiento
- **Problema:** Unused JavaScript y Render-blocking resources.
- **Impacto:** Tiempo de carga inicial lento.
- **Tarea:** Optimizar imports dinámicos y revisar la carga de fuentes/estilos.
