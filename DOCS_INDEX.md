# 📚 Índice de Documentación - FIX-AI-NEXT

**Sistema de Gestión de Talleres Electrónicos**

Guía rápida para navegar toda la documentación del proyecto.

---

## 🗺️ Roadmap y Planificación

### [ROADMAP.md](./ROADMAP.md) ⭐ **DOCUMENTO PRINCIPAL**
**El roadmap maestro unificado del proyecto.**

Contiene:
- ✅ Feature 1: Gestión Core (MVP) - COMPLETADO
- ⏳ Feature 2: Operaciones Esenciales - EN PROGRESO
- 📋 Feature 2.5: Plantillas de Servicio - PLANIFICADO
- 🔮 Feature 3: Administración Avanzada - FUTURO
- 🤖 Feature 4: Inteligencia Artificial - VISIÓN
- 🚀 Workflow v2.0: Ingreso Multi-Dispositivo
- 🛠️ Ejes Transversales (UI/UX, Testing)
- 📋 Próximas Tareas Prioritarias

**Última Actualización:** 10 de Diciembre, 2025
**Líneas:** 773

---

## 📖 Documentación Técnica

### [README.md](./README.md)
Guía de setup, instalación y primeros pasos.

**Contenido:**
- Requisitos del sistema
- Instalación paso a paso
- Configuración de variables de entorno
- Comandos útiles
- Estructura del proyecto

### [ARCHITECTURE.md](./ARCHITECTURE.md)
Arquitectura del sistema y decisiones técnicas.

**Contenido:**
- Diagrama de arquitectura
- Stack tecnológico
- Patrones de diseño
- Multi-tenancy
- Flujo de datos

### [DATABASE_GUIDE.md](./DATABASE_GUIDE.md)
Guía completa de la base de datos.

**Contenido:**
- Schema Prisma explicado
- Relaciones entre tablas
- Migraciones
- Seed de datos
- Queries comunes

### [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)
Resumen ejecutivo del proyecto.

**Contenido:**
- Visión general
- Características principales
- Estado actual
- Métricas clave

### [FOUNDATION_PRIORITIES.md](./FOUNDATION_PRIORITIES.md) ⭐ **NUEVO**

**Prioridades para fortalecer las bases del proyecto.**

**Contenido:**

- Sistema de scoring (Importancia + Urgencia + Facilidad + ROI)
- 20 áreas evaluadas con priorización
- Plan de acción semanal
- Quick Wins (tareas de <4 horas)
- Métricas de éxito

**Última Actualización:** 11 de Diciembre, 2025

---

## 🔄 Historial y Cambios

### [CHANGELOG.md](./CHANGELOG.md)
Historial detallado de cambios y versiones.

**Formato:** Keep a Changelog
**Secciones:** Added, Changed, Fixed, Removed

### [FIXES_APPLIED.md](./FIXES_APPLIED.md)
Registro de bugs resueltos y soluciones aplicadas.

---

## 🎨 Diseño y UI/UX

### [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) (si existe)
Sistema de diseño del proyecto.

**Contenido:**
- Paleta de colores
- Tipografías
- Componentes UI
- Guías de estilo

---

## 📦 Documentos Archivados

### [docs/archived/](./docs/archived/)
Versiones anteriores de roadmaps que fueron consolidados.

**Archivos:**
- `ROADMAP.md` (original)
- `FEATURES_V2_WORKFLOW.md`
- `ROADMAP_SERVICE_TEMPLATES.md`
- `DOCS_SERVICE_TEMPLATES_SUMMARY.md`

**Nota:** Consulta [docs/archived/README.md](./docs/archived/README.md) para más información.

---

## 🧩 Módulos del Proyecto

### [PROJECT_MODULES.md](./PROJECT_MODULES.md) (si existe)
Descripción detallada de cada módulo del sistema.

---

## 🚀 Guías de Desarrollo

### Estructura de Carpetas

```
FIX-AI-NEXT/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   ├── dashboard/         # Rutas autenticadas
│   │   └── tickets/status/    # Portal público
│   ├── components/            # Componentes reutilizables
│   ├── lib/                   # Lógica de negocio
│   │   ├── actions.ts         # Server Actions
│   │   ├── schemas.ts         # Validación Zod
│   │   └── prisma.ts          # Cliente Prisma
│   ├── hooks/                 # Custom React Hooks
│   ├── types/                 # TypeScript types
│   └── auth.ts                # Configuración NextAuth
├── prisma/
│   ├── schema.prisma          # Schema de base de datos
│   ├── migrations/            # Migraciones
│   └── seed.ts                # Datos iniciales
├── public/                    # Assets estáticos
└── docs/                      # Documentación
```

---

## 📝 Convenciones del Proyecto

### Commits
```
feat: nueva funcionalidad
fix: corrección de bug
docs: cambios en documentación
refactor: refactorización de código
test: añadir o modificar tests
chore: tareas de mantenimiento
```

### Branches
```
main/master         - Producción
develop            - Desarrollo
feature/*          - Nuevas características
bugfix/*           - Corrección de bugs
hotfix/*           - Fixes urgentes en producción
```

---

## 🔗 Enlaces Útiles

### Repositorio
- **GitHub:** [github.com/tu-usuario/FIX-AI-NEXT](.)
- **Issues:** Issues en GitHub
- **Pull Requests:** PRs en GitHub

### Deploy
- **Producción:** [tu-app.vercel.app](https://vercel.com)
- **Staging:** [staging-tu-app.vercel.app](https://vercel.com)

### Base de Datos
- **Neon Console:** [console.neon.tech](https://console.neon.tech)
- **Prisma Studio:** `npx prisma studio`

---

## 📊 Quick Reference

### Comandos Importantes

```bash
# Desarrollo
npm run dev              # Iniciar servidor de desarrollo

# Base de Datos
npx prisma migrate dev   # Crear migración
npx prisma db push       # Push schema sin migración
npx prisma studio        # Abrir Prisma Studio
npm run db:seed          # Ejecutar seed

# Build
npm run build            # Build para producción
npm run start            # Iniciar servidor de producción

# Linting
npm run lint             # Ejecutar ESLint
```

### Variables de Entorno Clave

```env
DATABASE_URL          # URL de PostgreSQL
AUTH_SECRET          # Secret para JWT
AUTH_URL             # URL de la aplicación
NEXTAUTH_URL         # URL para NextAuth
```

---

## 🎯 Inicio Rápido

### Para Desarrolladores Nuevos

1. **Lee primero:** [README.md](./README.md)
2. **Entiende la arquitectura:** [ARCHITECTURE.md](./ARCHITECTURE.md)
3. **Revisa el roadmap:** [ROADMAP.md](./ROADMAP.md)
4. **Configura el entorno:** Sigue el README
5. **Explora el código:** Empieza por `src/app/dashboard/`

### Para Product Managers

1. **Roadmap:** [ROADMAP.md](./ROADMAP.md)
2. **Resumen ejecutivo:** [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)
3. **Changelog:** [CHANGELOG.md](./CHANGELOG.md)

### Para Diseñadores

1. **Sistema de diseño:** [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
2. **Componentes UI:** `src/components/ui/`
3. **Estilos:** `src/app/globals.css`

---

## 📞 Soporte

- **Documentación:** Este archivo
- **Issues:** GitHub Issues
- **Email:** contacto@fix-ai.com (placeholder)

---

**Última Actualización:** 10 de Diciembre, 2025
**Mantenido por:** Equipo FIX-AI-NEXT
