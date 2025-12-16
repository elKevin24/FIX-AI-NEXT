# 📚 Índice de Documentación - FIX-AI-NEXT

Bienvenido a la documentación del sistema Multi-Tenant Workshop Management.

---

## 🚀 Inicio Rápido

- **[README.md](../README.md)** - Introducción al proyecto y guía de instalación
- **[GEMINI.md](../GEMINI.md)** - Contexto del proyecto para asistentes AI
- **[CHANGELOG.md](../CHANGELOG.md)** - Historial de cambios

---

## 🏗️ Arquitectura

### Documentos Principales
- **[ARCHITECTURE.md](architecture/ARCHITECTURE.md)** - Arquitectura general del sistema
- **[DATABASE_GUIDE.md](architecture/DATABASE_GUIDE.md)** - Guía de base de datos y Prisma
- **[PROJECT_MODULES.md](architecture/PROJECT_MODULES.md)** - Módulos y estructura del proyecto

### Conceptos Clave
- **Multi-tenancy**: Shared Database, Shared Schema
- **RBAC**: Roles (ADMIN, TECHNICIAN, RECEPTIONIST)
- **Stack**: Next.js 16, PostgreSQL, Prisma, NextAuth.js

---

## 🎨 Diseño

### Sistema de Diseño
- **[DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md)** - Principios y componentes del Design System

### Sistema de Temas
- **[THEME_SUMMARY.md](design/themes/THEME_SUMMARY.md)** ⭐ **EMPIEZA AQUÍ**
  - Resumen ejecutivo del sistema de temas
  - Calificación: 8.5/10
  - Quick reference

- **[THEME_SYSTEM_EVALUATION.md](design/themes/THEME_SYSTEM_EVALUATION.md)** 📊 **EVALUACIÓN COMPLETA**
  - Análisis detallado de 10 categorías
  - Fortalezas y debilidades
  - Comparación con frameworks profesionales
  - 22 páginas de análisis técnico

- **[THEME_IMPROVEMENTS_ROADMAP.md](design/themes/THEME_IMPROVEMENTS_ROADMAP.md)** 🗺️ **PLAN DE ACCIÓN**
  - Roadmap de mejoras (8.5 → 9.5/10)
  - Código exacto para cada mejora
  - Timeline de 2 sprints
  - Checklist de implementación

- **[THEME_ARCHITECTURE_DIAGRAM.md](design/themes/THEME_ARCHITECTURE_DIAGRAM.md)** 📐 **DIAGRAMAS**
  - Diagramas ASCII de arquitectura
  - Flujos visuales
  - Métricas de rendimiento

---

## 📖 Guías

### Deployment
- **[NEON_SETUP.md](guides/NEON_SETUP.md)** - Configuración de PostgreSQL en Neon
- **[VERCEL_SETUP.md](guides/VERCEL_SETUP.md)** - Deploy en Vercel

### Desarrollo
- **[AUDIT_IMPLEMENTATION.md](guides/AUDIT_IMPLEMENTATION.md)** - Sistema de auditoría

---

## 📂 Archivo

Documentos obsoletos o de referencia histórica están en:
- **[archived/](archived/)** - Roadmaps antiguos y documentación legacy

---

## 🎯 Por Rol

### Desarrollador Frontend
1. [DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md) - Componentes y estilos
2. [THEME_SUMMARY.md](design/themes/THEME_SUMMARY.md) - Sistema de temas
3. [ARCHITECTURE.md](architecture/ARCHITECTURE.md) - Estructura del proyecto

### Desarrollador Backend
1. [DATABASE_GUIDE.md](architecture/DATABASE_GUIDE.md) - Schema y migraciones
2. [ARCHITECTURE.md](architecture/ARCHITECTURE.md) - Multi-tenancy y RBAC
3. [AUDIT_IMPLEMENTATION.md](guides/AUDIT_IMPLEMENTATION.md) - Logging

### DevOps
1. [NEON_SETUP.md](guides/NEON_SETUP.md) - Base de datos
2. [VERCEL_SETUP.md](guides/VERCEL_SETUP.md) - Hosting
3. [DATABASE_GUIDE.md](architecture/DATABASE_GUIDE.md) - Migraciones

### Product Manager
1. [README.md](../README.md) - Overview del proyecto
2. [PROJECT_MODULES.md](architecture/PROJECT_MODULES.md) - Features
3. [CHANGELOG.md](../CHANGELOG.md) - Releases

### Designer / UX
1. [DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md) - Design tokens
2. [THEME_SUMMARY.md](design/themes/THEME_SUMMARY.md) - Temas y accesibilidad
3. [THEME_SYSTEM_EVALUATION.md](design/themes/THEME_SYSTEM_EVALUATION.md) - Evaluación UX

---

## 🔍 Buscar por Tema

### Temas y Estilos
- Design System → [DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md)
- Temas (Light/Dark/Colorblind) → [design/themes/](design/themes/)
- CSS Variables → [DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md)
- Glassmorphism → [DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md)

### Arquitectura
- Multi-tenancy → [ARCHITECTURE.md](architecture/ARCHITECTURE.md)
- Base de datos → [DATABASE_GUIDE.md](architecture/DATABASE_GUIDE.md)
- Autenticación → [ARCHITECTURE.md](architecture/ARCHITECTURE.md)
- RBAC → [ARCHITECTURE.md](architecture/ARCHITECTURE.md)

### Deployment
- PostgreSQL Cloud → [NEON_SETUP.md](guides/NEON_SETUP.md)
- Hosting → [VERCEL_SETUP.md](guides/VERCEL_SETUP.md)
- Migraciones → [DATABASE_GUIDE.md](architecture/DATABASE_GUIDE.md)

### Features
- Tickets → [PROJECT_MODULES.md](architecture/PROJECT_MODULES.md)
- Customers → [PROJECT_MODULES.md](architecture/PROJECT_MODULES.md)
- Parts → [PROJECT_MODULES.md](architecture/PROJECT_MODULES.md)
- Audit Log → [AUDIT_IMPLEMENTATION.md](guides/AUDIT_IMPLEMENTATION.md)

---

## 📊 Estado de la Documentación

| Categoría | Estado | Calidad |
|-----------|--------|---------|
| Arquitectura | ✅ Completo | ⭐⭐⭐⭐⭐ |
| Design System | ✅ Completo | ⭐⭐⭐⭐⭐ |
| Temas | ✅ Completo | ⭐⭐⭐⭐⭐ |
| Deployment | ✅ Completo | ⭐⭐⭐⭐ |
| API Reference | ⚠️ Parcial | ⭐⭐⭐ |
| Testing | ❌ Pendiente | - |

---

## 🤝 Contribuir

Para mantener la documentación actualizada:

1. **Agregar nuevo documento**: Colócalo en la carpeta apropiada
2. **Actualizar este índice**: Agrega referencia en la sección correcta
3. **Marcar obsoletos**: Mueve a `archived/` con fecha
4. **Nombrar archivos**: Usa MAYUSCULAS_CON_GUIONES.md
5. **Incluir frontmatter**: Fecha, autor, versión

---

## 📅 Última Actualización

- **Fecha**: 2025-12-15
- **Versión**: 2.0
- **Reorganización**: Estructura por categorías implementada
- **Documentos activos**: 12
- **Documentos archivados**: 5

---

## 🎓 Recursos Externos

### Next.js
- [Documentación oficial](https://nextjs.org/docs)
- [App Router](https://nextjs.org/docs/app)

### Prisma
- [Documentación oficial](https://www.prisma.io/docs)
- [Schema reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

### WCAG
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Mantenido por**: Equipo de Desarrollo FIX-AI-NEXT  
**Contacto**: adminkev@example.com
