# Roadmap: Sistema de Gestión de Talleres Electrónicos (FIX-AI-NEXT)

Este documento define el alcance y la hoja de ruta del proyecto, dividido en Features (Características) principales.

**Estado actual:** Feature 1 completado. Próximo objetivo: **Feature 2** (Operaciones Esenciales).

## Feature 1: Gestión Core de Taller (MVP) - [COMPLETADO]
## Feature 1: Gestión Core de Taller (MVP) - [EN PROGRESO - 85%]
**Objetivo:** Establecer la infraestructura base y permitir el flujo completo de reparación de dispositivos en un entorno multi-tenant. Es lo "alcanzable" a corto plazo.

### Etapa 1: Fundamentos y Arquitectura ✅ COMPLETADO
- [x] **Configuración del Proyecto**: Next.js 15, TypeScript, ESLint.
- [x] **Base de Datos**: Configuración de PostgreSQL y Prisma ORM.
- [x] **Autenticación**: Implementación de NextAuth v5 con Login.
- [x] **Multi-tenancy**: Aislamiento de datos por `tenantId` en todas las consultas.
- [x] **Roles y Permisos**: Control de acceso por rol (Admin, Técnico, Recepción).

### Etapa 2: Gestión de Entidades Principales
- [x] **Módulo de Usuarios**: Crear, editar y listar empleados del taller.
- [x] **Módulo de Clientes**: Registro y edición de clientes.
- [x] **Módulo de Tickets (Reparaciones)**:
    - Creación de ticket con detalles del dispositivo y falla.
    - Flujo de estados: *Abierto -> En Progreso -> Esperando Repuestos -> Resuelto -> Cerrado*.
    - Asignación de tickets a técnicos.
    - Edición completa de tickets (estado, prioridad, asignación).

### Etapa 3: Interfaz y Experiencia de Usuario
- [x] **Dashboard Principal**: Vista resumen con contadores (Tickets abiertos, urgentes, etc.).
- [x] **Buscador Global**: Buscar tickets por ID, cliente o dispositivo.
- [x] **Comentarios/Notas**: Bitácora de reparación con notas internas.

---

## Feature 2: Operaciones Esenciales del Taller - [PRÓXIMO]
**Objetivo:** Funcionalidades críticas para la operación diaria de un taller de reparaciones.

### Etapa 1: Documentación y Comunicación
- [ ] **Generación de PDF**: Orden de ingreso para imprimir/enviar al cliente con datos del equipo, falla reportada y firma.
- [ ] **Comprobante de Entrega**: PDF al cerrar ticket con resumen de trabajo realizado.

### Etapa 2: Notificaciones Automáticas
- [ ] **Notificaciones por Email**: Envío automático al cambiar estado del ticket.
- [ ] **Integración WhatsApp API**: Notificaciones por WhatsApp (usando API oficial o servicios como Twilio).
- [ ] **Plantillas de Mensajes**: Mensajes personalizables por tipo de notificación.

### Etapa 3: Control de Inventario
- [ ] **Catálogo de Repuestos**: CRUD de repuestos con SKU, costo, precio de venta.
- [ ] **Control de Stock**: Entradas, salidas, alertas de stock bajo.
- [ ] **Asignación a Tickets**: Vincular repuestos usados en cada reparación con cálculo automático de costos.

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
- [ ] **Consulta de Estado**: Página pública donde el cliente consulta su ticket con código único.
- [ ] **Aprobación de Presupuesto**: Cliente aprueba/rechaza presupuesto desde enlace.
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

### Etapa 3: Interfaz y Experiencia de Usuario 🟡 EN PROGRESO
- [x] **Dashboard Principal**: Vista resumen con contadores (Tickets abiertos, urgentes, etc.).
- [ ] **Buscador Global (Dashboard)**: Buscar tickets por ID, cliente o dispositivo. **Requiere autenticación** - Para usuarios del taller.
- [ ] **Comentarios/Notas**: Agregar notas internas al ticket (bitácora de reparación).
- [x] **Portal Público de Consulta**: Página donde el cliente consulta el estado de su equipo con código único (sin login). **NO requiere autenticación** - Para clientes.
- [x] **Mejoras de UI/UX**: Diseño mejorado de la página de estado del ticket con contrastes optimizados.

---

## Feature 4: Inteligencia Artificial (FIX-AI) - [VISIÓN]
**Objetivo:** Diferenciador competitivo mediante IA aplicada a diagnósticos.

### Etapa 1: Base de Conocimiento
- [ ] **Historial de Soluciones**: Registro estructurado de fallas y soluciones aplicadas.
- [ ] **Búsqueda Inteligente**: Buscar soluciones por síntomas similares.
### Etapa 1: Comunicación y Transparencia
- [x] **Portal Público de Consulta**: Página donde el cliente consulta el estado de su equipo con un código único (sin login). ✅ Mejorado con diseño optimizado.
- [ ] **Notificaciones Automáticas**: Envío de correos/WhatsApp al cambiar el estado del ticket.
- [ ] **Generación de Documentos**: PDF de orden de ingreso y comprobante de entrega.

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

### Corto Plazo (Sprint Actual)
1. **Buscador Global de Tickets (Dashboard - Requiere Autenticación)**
   - Buscar por ID, cliente, dispositivo
   - Filtros avanzados (estado, prioridad, fecha)
   - Implementar en `/dashboard/tickets`
   - **Nota**: Diferente del portal público que ya existe sin autenticación

2. **Sistema de Comentarios/Notas en Tickets**
   - Agregar campo `notes` o tabla `TicketComment`
   - UI para agregar notas internas
   - Historial de comentarios visible

3. **Mejoras en Dashboard**
   - Gráficos de tickets por estado
   - Métricas de productividad
   - Filtros por fecha

### Medio Plazo
4. **Notificaciones por Email**
   - Configurar servicio de email (Resend/SendGrid)
   - Notificaciones al cambiar estado de ticket
   - Templates de email

5. **Generación de PDFs**
   - Orden de ingreso
   - Comprobante de entrega
   - Usar librería como `react-pdf` o `pdfkit`

6. **Inventario de Repuestos**
   - CRUD completo de repuestos
   - Asignación de repuestos a tickets
   - Control de stock

