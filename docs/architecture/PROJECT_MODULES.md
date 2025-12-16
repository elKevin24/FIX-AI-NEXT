# 🧩 Arquitectura Modular: FIX-AI-NEXT

**Estrategia:** Desacoplar el sistema en módulos funcionales independientes. Esto permite desarrollar, probar y mejorar cada área sin afectar al resto.

---

## 📦 Módulo 1: S.A.T. (Servicio de Asistencia Técnica)
**El Corazón del Negocio.** Gestión del ciclo de vida de la reparación.

### 🔹 Base Actual (Cimientos)
*   **Entidades:** `Ticket`, `TicketNote`.
*   **Alcance:** Creación de ticket simple, cambio de estados manual, notas internas.
*   **Limitación:** 1 Ticket = 1 Dispositivo. Flujo lineal.

### 🚀 Alcance Mejorado (Planificación V2)
*   **Sesión de Servicio:** Ingreso masivo (Multi-equipo).
*   **Identidad de Activos:** Registro detallado de Marca/Modelo/Serial (`deviceDetails`).
*   **Protocolo de Ingreso:** Checklist de accesorios y estado físico (`checkInDetails`).
*   **Cancelaciones:** Flujo de anulación con motivo y restitución lógica.

---

## 📦 Módulo 2: Inventario y Logística
**El Cerebro de Recursos.** Gestión de repuestos y suministros.

### 🔹 Base Actual (Cimientos)
*   **Entidades:** `Part`, `PartUsage`.
*   **Alcance:** Catálogo simple (Nombre, Costo, Precio). Resta de cantidad al usar.
*   **Limitación:** No hay alertas, no hay distinción entre "reservado" y "usado".

### 🚀 Alcance Mejorado (Planificación V2)
*   **Reserva de Stock:** Al asignar una parte a un ticket en curso, el stock se "compromete" antes de consumirse.
*   **Semáforo de Stock:** Bloqueo de flujo si `Stock = 0` (Estado `WAITING_FOR_PARTS`).
*   **Auditoría de Movimientos:** Log exacto de quién sacó qué y para qué ticket.

---

## 📦 Módulo 3: CRM (Gestión de Clientes)
**La Relación Humana.** Base de datos de dueños de equipos.

### 🔹 Base Actual (Cimientos)
*   **Entidades:** `Customer`.
*   **Alcance:** Datos básicos (Nombre, Email, Teléfono). Lista de tickets asociados.

### 🚀 Alcance Mejorado (Planificación V2)
*   **Búsqueda Inteligente:** Live-search en el ingreso para evitar duplicados.
*   **Historial Unificado:** Ver "todos los equipos que ha traído Juan" en una sola vista.
*   **Creación Rápida:** Modal de alta de cliente sin salir del flujo de ticket.

---

## 📦 Módulo 4: Core & IAM (Identidad y Acceso)
**La Seguridad e Infraestructura.**

### 🔹 Base Actual (Cimientos)
*   **Entidades:** `User`, `Tenant`, `AuditLog`.
*   **Alcance:** Multi-tenancy, Roles (Admin/Tech/Recep), Login.

### 🚀 Alcance Mejorado (Planificación V2)
*   **RBAC Granular:** Permisos específicos por acción (ej. Recepcionista puede "Ver Stock" pero no "Modificar Cantidad").
*   **Auditoría Cruzada:** Trazabilidad completa (Quién creó el ticket, quién asignó la parte, quién lo cerró).

---

## 📊 Resumen de Planificación

Para "solidificar las bases", propongo atacar los módulos en este orden:

1.  **Módulo SAT (Prioridad Alta):** Implementar la estructura de datos para multi-equipo y checklist. (Ya iniciamos con `schema.prisma`).
2.  **Módulo Inventario (Prioridad Media):** Implementar la lógica de "Bloqueo por falta de stock".
3.  **Módulo CRM (Prioridad Baja por ahora):** Mejorar solo la búsqueda en el ingreso.

¿Estás de acuerdo con esta separación y priorización?
