# Roadmap: Sistema de Gestión de Talleres Electrónicos (FIX-AI-NEXT)

Este documento define el alcance y la hoja de ruta del proyecto, dividido en Features (Características) principales. Actualmente nos enfocaremos exclusivamente en el **Feature 1**.

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

## Feature 2: Ecosistema Avanzado y Automatización - [FUTURO]
**Objetivo:** Agregar valor mediante automatización, comunicación externa e inteligencia. Es "alcanzable pero más difícil".

### Etapa 1: Comunicación y Transparencia
- [ ] **Portal Público de Consulta**: Página donde el cliente consulta el estado de su equipo con un código único (sin login).
- [ ] **Notificaciones Automáticas**: Envío de correos/WhatsApp al cambiar el estado del ticket.
- [ ] **Generación de Documentos**: PDF de orden de ingreso y comprobante de entrega.

### Etapa 2: Control Administrativo Avanzado
- [ ] **Inventario de Repuestos**: Control de stock, asignación de repuestos a tickets.
- [ ] **Módulo de Caja/Facturación**: Costos de reparación, mano de obra, ganancias.
- [ ] **Métricas Avanzadas**: Reportes de productividad por técnico, ingresos mensuales.

### Etapa 3: Inteligencia (FIX-AI)
- [ ] **Base de Conocimiento**: Sugerencias de solución basadas en fallas similares previas.
- [ ] **Estimación de Tiempos**: Predicción de fecha de entrega basada en carga de trabajo.

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

