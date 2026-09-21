# Multi-Tenant Workshop Management System

Sistema integral para la gestión eficiente de talleres de reparación electrónica. Diseñado para centralizar operaciones, gestionar tickets de servicio y mejorar la atención al cliente en un entorno multi-taller seguro y escalable.

## 🚀 Características Principales

### 🏢 Arquitectura Multi-Taller

Diseñado para operar con múltiples sucursales o talleres independientes bajo una misma plataforma.

- **Aislamiento Total**: Cada taller gestiona sus propios clientes, tickets, usuarios e inventario sin interferencias.
- **Seguridad de Datos**: Garantía de que la información de un taller es accesible únicamente por su personal autorizado.

### 🎫 Gestión Avanzada de Tickets

Control total del ciclo de vida de las reparaciones.

- **Flujo de Trabajo Claro**: Estados definidos desde la recepción (`Abierto`) hasta la entrega (`Cerrado`), pasando por diagnóstico y reparación.
- **Priorización**: Clasificación de equipos por urgencia (Baja, Media, Alta).
- **Asignación Inteligente**: Distribución de trabajos a los técnicos adecuados.
- **Historial Completo**: Registro detallado de notas, diagnósticos y repuestos utilizados en cada servicio.

### 👥 Roles y Permisos

Sistema de acceso seguro basado en roles específicos para cada miembro del equipo.

- **Recepcionista**: Creación de tickets, gestión de clientes y atención en mostrador.
- **Técnico**: Diagnóstico, actualización de reparaciones, solicitud de repuestos y cierre de órdenes.
- **Administrador**: Gestión de usuarios, configuración del taller y supervisión global.

### 🔒 Auditoría y Seguridad

- **Trazabilidad Total**: Cada cambio en el sistema queda registrado (quién, qué y cuándo).
- **Control de Cambios**: Historial detallado de modificaciones en tickets para evitar malentendidos.

### 📱 Portal de Clientes

Acceso público simplificado para que los clientes consulten el estado de sus equipos en tiempo real, reduciendo las llamadas de consulta y mejorando la transparencia.

## 🎯 Flujos de Trabajo

### Recepción de Equipos

1. El cliente entrega el equipo.
2. El recepcionista registra los datos y crea un ticket con la descripción del problema.
3. El sistema asigna un número único de seguimiento.

### Proceso de Reparación

1. El técnico recibe la asignación.
2. Diagnostica el equipo y actualiza el estado a "En Progreso".
3. Registra notas técnicas y repuestos necesarios.
4. Finaliza la reparación y marca el ticket como "Resuelto".

### Entrega

1. El cliente es notificado (o consulta el estado en línea).
2. El equipo es entregado y el ticket se marca como "Cerrado".

## 🗺️ Estado y Roadmap

Evolución de la plataforma (verificado contra el código):

- [x] **Gestión de Inventario**: control de stock de repuestos y punto de venta (POS).
- [x] **Facturación**: módulo integrado para cobros y facturas.
- [x] **Reportes y Métricas**: panel de reportes con ingresos, tickets e inventario.
- [ ] **Notificaciones Automáticas**: alertas por correo/SMS/WhatsApp sobre cambios de estado.
- [ ] **Portal de Autoservicio Avanzado**: aprobación de presupuestos desde el portal público.
- [ ] **Soporte Multi-idioma**: interfaz disponible en varios idiomas.

El detalle completo por área (seguridad, frontend/a11y/performance, workflow de tickets, temas, triggers) vive en el [Roadmap Central](./docs/ROADMAP_MASTER.md).

---

## 📚 Documentación

- **[Índice de documentación](./docs/INDEX.md)** — guía completa del proyecto.
- **[Roadmap Central](./docs/ROADMAP_MASTER.md)** — estado agregado de todos los roadmaps, verificado contra el código.

---

**Gestión eficiente para talleres modernos.**
