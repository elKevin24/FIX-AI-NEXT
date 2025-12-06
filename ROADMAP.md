# Roadmap: Sistema de Gestión de Talleres Electrónicos (FIX-AI-NEXT)

Este documento define el alcance y la hoja de ruta del proyecto, dividido en Features (Características) principales.

**Estado actual:** Feature 1 completado. Próximo objetivo: **Feature 2** (Operaciones Esenciales).

## Feature 1: Gestión Core de Taller (MVP) - [COMPLETADO]
**Objetivo:** Establecer la infraestructura base y permitir el flujo completo de reparación de dispositivos en un entorno multi-tenant. Es lo "alcanzable" a corto plazo.

### Etapa 1: Fundamentos y Arquitectura
- [x] **Configuración del Proyecto**: Next.js 16, TypeScript, ESLint.
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

### Diseño y Experiencia de Usuario (UI/UX)
- [ ] **Sistema de Diseño**: Definir paleta de colores, tipografías y componentes base (Botones, Inputs, Cards) para consistencia visual.
- [ ] **Prototipado de Alta Fidelidad**: Diseñar las pantallas clave (Dashboard, Ticket View) antes de codificar.
- [ ] **Micro-interacciones**: Animaciones sutiles para feedback al usuario (ej. al guardar, cargar, error).

### Estrategia de Pruebas (Testing)
- [ ] **Pruebas Unitarias (Jest/Vitest)**: Verificar lógica de negocio crítica (cálculos de costos, validaciones de estado).
- [ ] **Pruebas de Integración**: Asegurar que la API y la Base de Datos conversen correctamente (especialmente el aislamiento multi-tenant).
- [ ] **Pruebas End-to-End (Playwright/Cypress)**: Simular flujos completos de usuario (Login -> Crear Ticket -> Cerrar Ticket) para evitar regresiones.

