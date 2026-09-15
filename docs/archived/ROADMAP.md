# Roadmap: Sistema de Gestión de Talleres Electrónicos (FIX-AI-NEXT)

Este documento define el alcance y la hoja de ruta del proyecto, dividido en Features (Características) principales.

**Estado actual:** Feature 1 completado. Próximo objetivo: **Feature 2** (Operaciones Esenciales).

## Feature 1: Gestión Core de Taller (MVP) - [COMPLETADO]
**Objetivo:** Establecer la infraestructura base y permitir el flujo completo de reparación de dispositivos en un entorno multi-tenant. Es lo "alcanzable" a corto plazo.

### Etapa 1: Fundamentos y Arquitectura ✅ COMPLETADO
- [x] **Configuración del Proyecto**: Next.js 16, TypeScript, ESLint.
- [x] **Base de Datos**: Configuración de PostgreSQL y Prisma ORM.
- [x] **Autenticación**: Implementación de NextAuth v5 con Login.
- [x] **Multi-tenancy**: Aislamiento de datos por `tenantId` con `tenant-prisma.ts` y validación en todas las consultas.
- [x] **Roles y Permisos**: Middleware para proteger rutas según rol (Admin, Técnico, Recepción).

### Etapa 2: Gestión de Entidades Principales ✅ COMPLETADO
- [x] **Módulo de Usuarios**: Crear, editar, listar y eliminar empleados del taller.
- [x] **Módulo de Clientes**: Registro de clientes con CRUD completo.
- [x] **Módulo de Tickets (Reparaciones)**:
    - [x] Creación de ticket con detalles del dispositivo y falla.
    - [x] Flujo de estados: *OPEN -> IN_PROGRESS -> WAITING_FOR_PARTS -> RESOLVED -> CLOSED*.
    - [x] Asignación de tickets a técnicos.
    - [x] Prioridades: LOW, MEDIUM, HIGH, URGENT.
    - [x] Edición completa de tickets (estado, prioridad, asignación).

### Etapa 3: Interfaz y Experiencia de Usuario ✅ COMPLETADO
- [x] **Dashboard Principal**: Vista resumen con contadores (Tickets abiertos, urgentes, etc.).
- [x] **Buscador Global (Dashboard)**: Buscar tickets por ID, cliente o dispositivo. **Requiere autenticación** - Para usuarios del taller.
- [x] **Comentarios/Notas**: Bitácora de reparación con notas internas.
- [x] **Portal Público de Consulta**: Página donde el cliente consulta el estado de su equipo con código único (sin login). **NO requiere autenticación** - Para clientes.
- [x] **Mejoras de UI/UX**: Diseño mejorado de la página de estado del ticket con contrastes optimizados.

---

## Feature 2: Operaciones Esenciales del Taller - [EN PROGRESO]
**Objetivo:** Funcionalidades críticas para la operación diaria de un taller de reparaciones.

### Etapa 1: Documentación y Comunicación ✅ COMPLETADO
- [x] **Portal Público de Consulta**: Página donde el cliente consulta el estado de su equipo con un código único (sin login). ✅ Mejorado con diseño optimizado.
- [x] **Generación de PDF**: Orden de ingreso para imprimir/enviar al cliente con datos del equipo, falla reportada y firma. ✅ Implementado con @react-pdf/renderer.
- [x] **Comprobante de Entrega**: PDF al cerrar ticket con resumen de trabajo realizado. ✅ Implementado con diseño profesional.

### Etapa 2: Notificaciones Automáticas
- [ ] **Notificaciones por Email**: Envío automático al cambiar estado del ticket.
- [ ] **Integración WhatsApp API**: Notificaciones por WhatsApp (usando API oficial o servicios como Twilio).
- [ ] **Plantillas de Mensajes**: Mensajes personalizables por tipo de notificación.

### Etapa 3: Control de Inventario ✅ COMPLETADO
- [x] **Catálogo de Repuestos**: CRUD de repuestos con SKU, costo, precio de venta.
- [x] **Control de Stock**: Entradas, salidas, alertas de stock bajo.
- [x] **Asignación a Tickets**: Vincular repuestos usados en cada reparación con cálculo automático de costos.

---

## Feature 2.5: Sistema de Plantillas de Servicio - [PLANIFICADO] 🎯

**Objetivo:** Estandarizar servicios comunes (mantenimientos, reparaciones típicas, instalaciones) mediante plantillas predefinidas que agilizan la creación de tickets y mejoran la consistencia operativa.

**Documentación Detallada:** Ver [ROADMAP_SERVICE_TEMPLATES.md](./ROADMAP_SERVICE_TEMPLATES.md)

### Etapa 1: Fundamentos y Backend ⏳ PRÓXIMO

- [ ] **Modelo de Datos**: `ServiceTemplate`, `TemplatePartDefault`, enum `ServiceCategory`
- [ ] **Seed Inicial**: 10+ plantillas predefinidas (mantenimientos, reparaciones, upgrades, instalaciones)
- [ ] **Server Actions CRUD**: Crear, editar, eliminar, listar plantillas
- [ ] **Integración con Tickets**: Campo `serviceTemplateId` en tickets

### Etapa 2: Interfaz de Gestión (Admin) ⏳

- [ ] **Página de Administración**: `/dashboard/settings/service-templates`
- [ ] **Formularios**: Crear/editar plantillas con configuración completa
- [ ] **Gestión de Repuestos Default**: Asociar repuestos comunes a plantillas
- [ ] **Activar/Desactivar**: Control de visibilidad de plantillas

### Etapa 3: Uso en Creación de Tickets ⏳

- [ ] **Selector Visual**: Grid de plantillas categorizadas en `TicketWizard`
- [ ] **Auto-relleno**: Título, descripción, prioridad, repuestos sugeridos
- [ ] **Creación Rápida**: Botón "Crear desde plantilla" en listado de tickets
- [ ] **Modo Híbrido**: Usar plantilla + personalizar campos

### Etapa 4: Analytics y Reportes ⏳

- [ ] **Dashboard de Plantillas**: Servicios más solicitados, ingresos por categoría
- [ ] **Métricas**: Tickets creados por plantilla, tiempo real vs estimado
- [ ] **Optimización**: Identificar plantillas populares vs sub-utilizadas

### Plantillas Incluidas

- 🔧 **Mantenimientos**: Preventivo Básico, Premium, Limpieza Express
- 🛠️ **Reparaciones**: Display, Batería, Eliminación de Virus
- 🚀 **Upgrades**: SSD, RAM
- 💻 **Instalaciones**: SO, Office/Software
- 🔬 **Diagnósticos**: Evaluación técnica completa

**Estimación:** 11-15 días de desarrollo (Fases 1-4)

---

## Feature 3: Administración Avanzada - [FUTURO]
**Objetivo:** Herramientas para el control financiero y análisis del negocio.

### Etapa 1: Facturación y Finanzas
- [ ] **Módulo de Caja**: Registro de cobros, métodos de pago, caja chica.
- [ ] **Facturación**: Generación de facturas/recibos con desglose de repuestos y mano de obra.
- [ ] **Reportes Financieros**: Ingresos, gastos, ganancias por período.

### Etapa 2: Métricas y Reportes
- [ ] **Productividad por Técnico**: Tickets completados, tiempo promedio de reparación.
- [ ] **Estadísticas de Negocio**: Tipos de fallas más comunes, marcas más reparadas.
- [ ] **Exportación de Datos**: Exportar reportes a Excel/CSV.

### Etapa 3: Portal Público
- [ ] **Aprobación de Presupuesto**: Cliente aprueba/rechaza presupuesto desde enlace.

---

## Feature 4: Inteligencia Artificial (FIX-AI) - [VISIÓN]
**Objetivo:** Diferenciador competitivo mediante IA aplicada a diagnósticos.

### Etapa 1: Base de Conocimiento
- [ ] **Historial de Soluciones**: Registro estructurado de fallas y soluciones aplicadas.
- [ ] **Búsqueda Inteligente**: Buscar soluciones por síntomas similares.

### Etapa 2: Asistente de Diagnóstico
- [ ] **Sugerencias Automáticas**: Al describir falla, sugerir posibles causas basadas en historial.
- [ ] **Probabilidad de Diagnóstico**: Mostrar % de coincidencia con casos anteriores.

### Etapa 3: Automatización Avanzada
- [ ] **Dictado por Voz**: Técnico dicta notas desde móvil.
- [ ] **Estimación de Tiempos**: Predicción de fecha de entrega según carga de trabajo.

---

## 🚀 El "Plus" (Nuestros Diferenciadores)
Lo que hará que este sistema destaque sobre un Excel o software tradicional:

### 1. Asistente de Diagnóstico con IA (El Corazón de FIX-AI)
En lugar de solo registrar datos, el sistema **ayuda** al técnico.
- **Sugerencia de Reparación**: Al ingresar "No enciende, consumo 0.5A", la IA busca en la base de datos histórica y sugiere: *"Posible corto en línea principal o PMIC dañado (80% probabilidad)"*.
- **Dictado por Voz**: El técnico puede dictar las notas de reparación desde su celular en lugar de escribir con las manos ocupadas/sucias.

### 2. Comunicación Proactiva (WhatsApp First)
La mayoría de los clientes no revisan correos.
- **Integración WhatsApp API**: Notificaciones automáticas reales. *"Tu iPhone 13 ya fue diagnosticado. Autoriza el presupuesto aquí: [Link]"*.
- **Aprobación Digital**: El cliente aprueba el presupuesto desde su celular con un clic, actualizando el estado del ticket automáticamente.

### 3. Multi-Tenancy Real y Escalable
- No es solo un software para un taller, es una **plataforma SaaS**. Podrías vender suscripciones a otros talleres en el futuro.

---

## 🛠️ Ejes Transversales: Diseño y Calidad
Estas tareas se realizan en paralelo a todo el desarrollo para garantizar un producto robusto y visualmente impactante.

### Diseño y Experiencia de Usuario (UI/UX) ✅ COMPLETADO
- [x] **Sistema de Diseño**: Paleta de colores, tipografías y componentes base definidos en `DESIGN_SYSTEM.md`.
- [x] **Componentes UI**: Botones, Inputs, Cards, Badges, Alerts implementados y documentados.
- [x] **Micro-interacciones**: Animaciones sutiles implementadas (fade-in, slide-up, hover effects).
- [x] **Accesibilidad**: Contrastes optimizados cumpliendo WCAG AA en todas las páginas.
- [x] **Responsive Design**: Diseño adaptativo para móvil, tablet y desktop.
- [ ] **Prototipado de Alta Fidelidad**: Diseñar las pantallas clave restantes (Dashboard avanzado, Ticket View completo).

### Estrategia de Pruebas (Testing) 🔴 PENDIENTE
- [ ] **Pruebas Unitarias (Jest/Vitest)**: Verificar lógica de negocio crítica (cálculos de costos, validaciones de estado).
- [ ] **Pruebas de Integración**: Asegurar que la API y la Base de Datos conversen correctamente (especialmente el aislamiento multi-tenant).
- [ ] **Pruebas End-to-End (Playwright/Cypress)**: Simular flujos completos de usuario (Login -> Crear Ticket -> Cerrar Ticket) para evitar regresiones.

---

## 📋 Próximas Tareas Prioritarias

### ✅ Completadas Recientemente
1. ~~**Buscador Global de Tickets (Dashboard)**~~ ✅
   - ✅ Buscar por ID, cliente, dispositivo
   - ✅ Filtros avanzados (estado, prioridad, asignado)
   - ✅ Implementado en `/dashboard/tickets`

2. ~~**Sistema de Comentarios/Notas en Tickets**~~ ✅
   - ✅ Tabla `TicketNote` con autor y timestamps
   - ✅ UI para agregar notas internas
   - ✅ Historial de comentarios visible
   - ✅ Permisos de eliminación (autor o admin)

3. ~~**Generación de PDFs**~~ ✅
   - ✅ Orden de ingreso con diseño profesional
   - ✅ Comprobante de entrega con bitácora
   - ✅ Implementado con `@react-pdf/renderer`
   - ✅ Botones de descarga en detalle del ticket

### Corto Plazo (Recientemente Completado)
4. ~~**Mejoras en Dashboard**~~ ✅
   - ✅ Gráficos de tickets por estado (Pie Chart interactivo)
   - ✅ Métricas de productividad por técnico (Bar Chart + Tabla)
   - ✅ Widget de tickets urgentes con prioridad
   - ✅ Tabla de tickets recientes
   - ✅ Cards mejorados con iconos y animaciones
   - ✅ Diseño responsive y dark mode

### Medio Plazo
5. ~~**Inventario de Repuestos**~~ ✅
   - ✅ CRUD completo de repuestos
   - ✅ Asignación de repuestos a tickets
   - ✅ Control de stock y alertas de stock bajo
   - ✅ Cálculo automático de costos en tickets
   - ✅ Visualización de margen y ganancias

6. ~~**Migración a Base de Datos Neon**~~ ✅
   - ✅ Configuración de Neon PostgreSQL
   - ✅ Migración de esquema con Prisma
   - ✅ Seed de datos iniciales
   - ✅ Actualización de variables de entorno

7. **Notificaciones por Email**
   - Configurar servicio de email (SMTP/Nodemailer)
   - Notificaciones al cambiar estado de ticket
   - Templates de email profesionales
   - Opción de enviar PDFs por email