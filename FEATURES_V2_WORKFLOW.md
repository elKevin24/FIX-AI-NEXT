# 🚀 FIX-AI-NEXT: Especificación de Flujo de Trabajo Avanzado (v2.0)

**Fecha:** 9 de Diciembre, 2025
**Estado:** Borrador de Diseño
**Objetivo:** Transformar el sistema de un "Tracker de Tickets" simple a un "ERP de Taller" completo, soportando ingresos masivos, gestión inteligente de inventario y ciclos de vida complejos.

### Nota Importante:
Este documento prioriza la implementación de la **Versión 2.0 (Flujo Base Sólido)**. Las secciones de "Fases Futuras" delinean mejoras estratégicas a largo plazo y no deben implementarse en la iteración actual.

---

## 1. Visión General del Cambio

El sistema actual trata cada reparación como un evento aislado (`1 Ticket`). La versión 2.0 introduce el concepto de **Sesión de Servicio**, donde un cliente puede ingresar múltiples dispositivos, cada uno con su propia identidad, accesorios y necesidades de repuestos, manteniendo una trazabilidad estricta de inventario y seguridad.

### Principales Mejoras (Versión 2.0 - Foco Principal)
*   **Ingreso Multi-Dispositivo:** Cargar 3 equipos en una sola operación.
*   **Identidad de Hardware:** Registro de Marca, Modelo, Serial y Estado Físico.
*   **Gestión de Accesorios:** Checklist obligatorio al ingreso (evita reclamos).
*   **Flujo de Repuestos:** Validación de Stock en tiempo real vs. Solicitud de Pedido.
*   **Cancelación Flexible:** Capacidad de abortar reparaciones en cualquier etapa.

---

## 2. Nuevos Flujos de Usuario (User Journeys)

### 2.1 Flujo de Recepción (El "Check-In")
**Actor:** Recepcionista

1.  **Identificación:** Busca Cliente (Live Search) o Crea Nuevo.
2.  **Carga de Dispositivos (Loop):**
    *   *Dispositivo A:* Laptop Dell Inspiron. Serial: `XJ900`.
    *   *Estado:* "Golpe en esquina".
    *   *Accesorios:* `[x] Cargador` `[ ] Funda` `[ ] Mouse`.
    *   *Falla:* "Pantalla azul".
    *   *(Opción "Agregar otro dispositivo" -> Dispositivo B...)*
3.  **Confirmación:** Se generan N Tickets vinculados. Se imprime (opcional) comprobante de ingreso con lista de accesorios.

### 2.2 Flujo de Diagnóstico y Repuestos
**Actor:** Técnico

1.  **Revisión:** Técnico abre Ticket. Diagnostica falla.
2.  **Decisión de Materiales:**
    *   **Caso A (Hay Stock):** Busca "SSD 240GB". Sistema confirma `Stock: 5`. Asigna pieza. Stock baja a 4. Costo se suma al ticket.
    *   **Caso B (Sin Stock):** Busca "Display X". Sistema confirma `Stock: 0`. Técnico marca "Solicitar Pedido". Estado cambia a `WAITING_FOR_PARTS`.
3.  **Notificación:** Admin recibe alerta de pedido. Al ingresar la pieza, sistema notifica al técnico para reanudar.

### 2.3 Flujo de Cancelación (Abortar Misión)
**Actor:** Cliente / Recepcionista

*   **Disparador:** Cliente decide no reparar por costo o demora.
*   **Acción:** Usuario con permiso pulsa "Cancelar Ticket".
*   **Validaciones:**
    *   Si hay repuestos asignados, ¿se devuelven al stock o ya se usaron? (Prompt de decisión).
    *   Estado cambia a `CANCELLED`.
    *   Se requiere motivo obligatorio (ej. "Presupuesto rechazado").
    *   Audit Log registra quién y por qué canceló.

---

## 3. Especificaciones Técnicas y Datos

### 3.1 Cambios en Modelo de Datos (`schema.prisma`)

#### Actualización de `Ticket`
Se agregan campos para identidad del dispositivo y estado inicial.

```prisma
model Ticket {
  // ... campos existentes ...
  
  // Identidad del Equipo
  deviceType    String?   @default("PC") // Laptop, Smartphone, Console
  deviceModel   String?   // "MacBook Pro M1"
  serialNumber  String?   // Para seguridad y garantía
  
  // Estado de Recepción
  accessories   String?   // JSON/Texto: "Cargador, Funda"
  checkInNotes  String?   // "Pantalla rayada previa"
  
  // Ciclo de Vida
  cancellationReason String? // Solo si status == CANCELLED
}
```

#### Actualización de `TicketStatus` (Enum)
```prisma
enum TicketStatus {
  OPEN
  IN_PROGRESS
  WAITING_FOR_PARTS
  RESOLVED
  CLOSED
  CANCELLED // Nuevo estado final
}
```

### 3.2 Seguridad y Permisos (RBAC)

| Acción | ADMIN | TECHNICIAN | RECEPTIONIST |
| :--- | :---: | :---: | :---: |
| Crear Ticket Masivo | ✅ | ✅ | ✅ |
| Asignar Repuestos (Bajar Stock) | ✅ | ✅ | ❌ |
| Solicitar Pedido | ✅ | ✅ | ❌ |
| Ingresar Stock (Compras) | ✅ | ❌ | ❌ |
| **Cancelar Ticket** | ✅ | ⚠️ (Solo propios) | ✅ |
| Eliminar Ticket (Hard Delete) | ✅ | ❌ | ❌ |

### 3.3 Auditoría (`AuditLog`)
Cada paso crítico genera un registro inmutable:

*   `TICKET_BATCH_CREATE`: "Juan creó 3 tickets para Cliente X".
*   `PART_ASSIGNED`: "Técnico usó 1 SSD en Ticket T-100".
*   `TICKET_CANCELLED`: "Recepcionista canceló T-100. Motivo: Cliente no tiene dinero".

---

## 4. Plan de Implementación (Versión 2.0)

### Fase 1: Cimientos de Datos
- [x] Modificar `schema.prisma` (Nuevos campos y Enum).
- [x] Ejecutar migraciones (`db:migrate`).
- [ ] Actualizar tipos de TypeScript y Zod Schemas.

### Fase 2: Lógica de Negocio (Backend)
- [ ] Crear Server Action `createBatchTickets` (Transaccional).
- [ ] Actualizar Server Action `updateTicketStatus` para manejar cancelación y devolución de stock.
- [ ] Implementar lógica de `checkStock` antes de asignar partes.

### Fase 3: Interfaz de Usuario (Frontend)
- [ ] Crear componente `TicketWizard` (Formulario por pasos).
- [ ] Implementar manejo de estado complejo (Array de dispositivos).
- [ ] Actualizar `TicketDetailView` para mostrar accesorios y botón de Cancelar.

### Fase 4: Calidad y Tests
- [ ] Unit Tests: Verificar que el stock no baje si falla la transacción.
- [ ] Integration Tests: Flujo completo de Crear -> Asignar Parte -> Cancelar.

---

## 5. Fases Futuras (Versión 3.0+) - Hoja de Ruta Estratégica

Estas funcionalidades se consideran para iteraciones posteriores a la consolidación de la Versión 2.0.

### 5.1. 💰 Módulo de Presupuestos y Aprobaciones
*   **Descripción:** Permitir al técnico generar un presupuesto detallado (partes + mano de obra) y enviarlo al cliente para su aprobación digital antes de iniciar la reparación.
*   **Nuevo Flujo:** `DIAGNOSIS` -> `QUOTED` (Presupuestado) -> `CUSTOMER_APPROVAL` -> `IN_PROGRESS`.
*   **Beneficios:** Mayor transparencia, reduce equipos abandonados, agiliza la toma de decisiones del cliente.
*   **Impacto:** Nuevo modelo `Quote`, integración con email para aprobación, nuevos estados de ticket.

### 5.2. 📢 Motor de Notificaciones Avanzado
*   **Descripción:** Sistema centralizado para el envío de notificaciones automatizadas vía diversos canales (WhatsApp, SMS, Email) en puntos clave del flujo.
*   **Ejemplos:**
    *   "Tu equipo [Modelo] ha sido ingresado con ticket [ID]." (Al Recepción)
    *   "Tu presupuesto para [Equipo] ya está disponible." (Al Presupuesto)
    *   "Tu equipo [Modelo] está listo para retirar." (Al Finalizar)
*   **Beneficios:** Mejora la comunicación con el cliente, reduce llamadas de consulta, fidelización.
*   **Impacto:** Integración con APIs de terceros (Twilio, SendGrid), configuración de plantillas, módulo de gestión de notificaciones.

### 5.3. 🏷️ Gestión Física con Etiquetado QR
*   **Descripción:** Generación de códigos QR únicos por ticket/dispositivo que, al ser escaneados, abren instantáneamente la información relevante del ticket.
*   **Uso:** Impresión de etiquetas para adherir al equipo. Escaneo con smartphone para acceso rápido.
*   **Beneficios:** Elimina búsquedas manuales, agiliza el flujo de trabajo en el taller, reduce errores.
*   **Impacto:** Generación de QR (librería), lector de QR en la interfaz (webcam), diseño de etiquetas imprimibles.

### 5.4. ⏱️ Métricas de Eficiencia (Time Tracking)
*   **Descripción:** Herramientas para registrar el tiempo invertido por los técnicos en cada reparación, permitiendo análisis de productividad y rentabilidad.
*   **Feature:** Botones "Iniciar Trabajo" / "Pausar" / "Finalizar Trabajo" en la vista del ticket.
*   **Beneficios:** Optimización de costos, evaluación de rendimiento de técnicos, base para precios de mano de obra.
*   **Impacto:** Nuevo modelo `WorkLog` (o `TimeEntry`), reportes en Dashboard, integración con roles.

---

**Prioridad:** El foco de desarrollo actual permanece en la implementación completa y robusta de la **Versión 2.0**. Las Fases Futuras son una guía para el crecimiento estratégico del producto.