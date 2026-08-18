# Changelog - FIX-AI-NEXT

Registro de cambios y nuevas funcionalidades implementadas en el proyecto.

---

## [Sprint 2026-08-17] - Multi-Tenant Isolation & Concurrency Safety 🔐

### 🔒 Seguridad Multi-Tenant

#### 1. Aislamiento Centralizado de Tenant en Capa Prisma
**Descripción**: Sistema centralizado para garantizar que ningún `tenantId` pueda filtrarse entre inquilinos, incluso cuando se pasan valores maliciosos en `where` de `update`/`delete`.

**Cambios Clave**:
- `src/lib/tenant-prisma.ts`: Extension de Prisma que inyecta automáticamente `tenantId` en:
  - Todas las operaciones de lectura (`findMany`, `findFirst`, `findUnique`, `count`, `aggregate`, `groupBy`)
  - Operaciones de escritura (`create`, `createMany`, `update`, `updateMany`, `delete`, `deleteMany`)
  - Sanitización de `where` en `update` y `delete` para prevenir inyección de `tenantId` malicioso
  - Validación previa de autorización mediante búsqueda segura del registro

#### 2. Atomicidad en Reserva de Inventario
**Descripción**: Garantiza que bajo concurrencia extrema (múltiples workers consumiendo el último stock simultáneamente), solo UNO logre la transacción.

**Cambios Clave**:
- `src/lib/inventory-atomic.ts`: Función `reserveInventoryForTenant()` que usa condición atómica:
  - `where: { id, tenantId, quantity: { gte: quantity } }` como guarda antes de decrementar
  - Permite que Postgres/Neon aplique aislamiento `SERIALIZABLE` a nivel de transacción
  - Evita race conditions en stock compartido

### ✅ Tests de Regresión
- `src/lib/tenant-isolation.test.ts`: Valida que intentos de override de `tenantId` en `where` fallan
- `src/lib/inventory-concurrency.test.ts`: Simula 10 workers concurrentes contra 1 unidad de stock
- `tests/integration/neon-concurrency.integration.test.ts`: **Nuevo** - Prueba real contra Neon/Postgres con:
  - Guard automático: omitida si `DATABASE_URL` es `localhost` o ausente (safe para CI/CD)
  - 10 workers con `Prisma.TransactionIsolationLevel.Serializable`
  - Validación: solo 1 éxito, 9 fallos por serialización

**Resultado**: 10 tests pasados | 1 suite omitida cuando no hay DB real

---

## [Sprint 2026-02-01] - Flujo de Trabajo Avanzado y Disponibilidad de Técnicos

### ✨ Nuevas Funcionalidades

#### 1. Sistema de Flujo de Trabajo de Tickets (Fase 2) 🔄
**Descripción**: Reemplazo de los controles básicos de estado por un flujo de trabajo guiado y seguro.

**Implementación**:
- Panel de acciones contextual (`TicketWorkflowActions`): Los botones cambian dinámicamente según el estado del ticket.
- Diálogos de confirmación para acciones críticas:
  - **Cancelar Ticket**: Requiere motivo obligatorio y advierte sobre restauración de inventario.
  - **Resolver Ticket**: Exige informe final de trabajo.
  - **Pausar por Repuestos**: Permite detener el SLA indicando qué falta.
  - **Asignar Técnico**: Interfaz mejorada para administradores.
- Auditoría mejorada: Las notas ingresadas en los diálogos se guardan automáticamente en la bitácora.

#### 2. Gestión de Disponibilidad de Técnicos 📅
**Descripción**: Control de ausencias y bloqueo automático de asignaciones.

**Implementación**:
- **Nueva Ruta**: `/dashboard/technicians/[id]/availability`
- **Funcionalidades**:
  - Registro de ausencias (Vacaciones, Enfermedad, Permiso, Capacitación).
  - Visualización de historial con indicadores de estado (Activo/Pasado).
  - **Lógica de Bloqueo**: El sistema impide asignar tickets a técnicos con ausencias activas.
  - **Actualización Automática**: El estado del usuario cambia en tiempo real si la ausencia inicia hoy.

#### 3. Componentes UI Reutilizables 🎨
- **Modal**: Nuevo componente de diálogo accesible con animaciones y backdrop blur.
- **Button**: Nueva variante `warning` para acciones de pausa/espera.

### 🛠 Mejoras Técnicas
- **Validación Zod**: Esquemas estrictos para rangos de fechas (`endDate >= startDate`).
- **Tests Unitarios**: Cobertura completa para lógica de creación y validación de ausencias (`src/lib/technician-actions.test.ts`).
- **Seguridad**: Validación de roles (solo Admin puede gestionar disponibilidad de otros).

---

## [Sprint 2025-12-10] - Sistema de Inventario y Migración a Neon

### ✨ Nuevas Funcionalidades

#### 1. Sistema de Inventario de Repuestos 🔧
**Descripción**: Sistema completo de gestión de inventario con control de stock y asignación a tickets.

**Implementación**:
- Server actions para CRUD completo de repuestos
- Páginas de listado, creación y edición de repuestos
- Componente de gestión de repuestos en tickets
- Control automático de stock con transacciones Prisma

**Características**:

##### Gestión de Repuestos
- **Ruta**: `/dashboard/parts`
- **Funcionalidades**:
  - Listado completo de repuestos con información detallada
  - Métricas de inventario (total de items, valor total, alertas de stock bajo)
  - Visualización de: nombre, SKU, cantidad, costo, precio, margen, uso
  - Indicadores visuales de stock bajo (≤5 unidades)
  - Botón para crear nuevos repuestos

##### Crear Repuesto
- **Ruta**: `/dashboard/parts/create`
- **Campos**:
  - Nombre del repuesto (requerido)
  - SKU/Código (opcional)
  - Cantidad inicial (requerido)
  - Costo en USD (requerido)
  - Precio de venta en USD (requerido)
- **Validaciones**:
  - Valores numéricos positivos
  - Formato decimal para precios
  - Aislamiento multi-tenant automático

##### Editar Repuesto
- **Ruta**: `/dashboard/parts/[id]/edit`
- **Funcionalidades**:
  - Formulario de edición con valores pre-cargados
  - Visualización de margen de ganancia
  - Cálculo de valor total en stock
  - Zona de peligro para eliminación (solo admins)
  - Protección contra eliminación si tiene registros de uso
- **Sidebar informativo**:
  - Tenant asociado
  - Margen de ganancia calculado automáticamente
  - Valor total del inventario

##### Asignación a Tickets
- **Componente**: `PartsSection` en detalle de ticket
- **Funcionalidades**:
  - Formulario para agregar repuestos al ticket
  - Selector de repuestos con información de stock
  - Validación de cantidad disponible
  - Control de cantidad máxima según stock
  - Tabla de repuestos utilizados con:
    - Nombre y SKU del repuesto
    - Cantidad utilizada
    - Costo unitario y precio unitario
    - Subtotal calculado
  - Cálculos automáticos:
    - Costo total de repuestos
    - Precio total para el cliente
    - Margen de ganancia ($ y %)
  - Opción para eliminar repuestos del ticket
  - Restauración automática de stock al eliminar

**Server Actions Implementadas**:
```typescript
// En src/lib/actions.ts
- createPart()        // Crear nuevo repuesto
- updatePart()        // Actualizar repuesto existente
- deletePart()        // Eliminar repuesto (con validación de uso)
- addPartToTicket()   // Asignar repuesto a ticket (con transacción)
- removePartFromTicket() // Quitar repuesto de ticket (restaura stock)
```

**Seguridad y Validaciones**:
- ✅ Aislamiento multi-tenant en todas las operaciones
- ✅ Validación de stock antes de asignar
- ✅ Transacciones atómicas para actualización de stock
- ✅ Protección contra eliminación de repuestos en uso
- ✅ Validación de permisos (admins para eliminar)
- ✅ Verificación de existencia de repuestos y tickets

**Archivos Creados**:
```
src/app/dashboard/parts/
├── page.tsx                         # Listado de repuestos
├── create/
│   └── page.tsx                     # Formulario de creación
└── [id]/
    └── edit/
        ├── page.tsx                 # Servidor de edición
        └── PartEditForm.tsx         # Formulario cliente de edición

src/app/dashboard/tickets/[id]/
└── PartsSection.tsx                 # Componente de gestión en tickets
```

**Archivos Modificados**:
- `src/lib/actions.ts` - Agregadas 5 server actions para repuestos (+290 líneas)
- `src/app/dashboard/tickets/[id]/page.tsx` - Agregada query de partsUsed y availableParts
- `src/app/dashboard/tickets/[id]/TicketDetailView.tsx` - Integrado PartsSection component

---

#### 2. Migración a Base de Datos Neon 🚀
**Descripción**: Migración completa de la base de datos local a Neon PostgreSQL en la nube.

**Implementación**:
- Configuración de conexión a Neon PostgreSQL
- Sincronización del esquema con Prisma
- Seed de datos iniciales
- Actualización de variables de entorno

**Proceso de Migración**:
1. Configuración de DATABASE_URL con credenciales de Neon
2. Ejecución de `prisma db push` para sincronizar esquema
3. Ejecución de `prisma db seed` para poblar datos iniciales
4. Actualización de `.env` para usar Neon por defecto
5. Verificación de funcionamiento del servidor

**Datos Seeded**:
- 1 Tenant (ElectroFix Workshop)
- 4 Usuarios (1 admin, 2 técnicos, 1 recepcionista)
- 4 Clientes de ejemplo
- 5 Repuestos de ejemplo
- 5 Tickets de ejemplo
- Registros de uso de repuestos
- Logs de auditoría

**Credenciales de Acceso**:
```
Admin: admin@electrofix.com / password123
Técnico 1: tech1@electrofix.com / password123
Técnico 2: tech2@electrofix.com / password123
Recepcionista: recep@electrofix.com / password123
```

**Configuración**:
```env
# Conexión DIRECTA (para migraciones)
DATABASE_URL="postgresql://neondb_owner:npg_l3O0mWGqFBCY@ep-gentle-hill-adon7ba3.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Conexión POOLED (para producción - opcional)
# DATABASE_URL="postgresql://neondb_owner:npg_l3O0mWGqFBCY@ep-gentle-hill-adon7ba3-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

**Beneficios**:
- ✅ Base de datos en la nube (no requiere Docker local)
- ✅ Mayor disponibilidad y confiabilidad
- ✅ Escalabilidad automática
- ✅ Backups automáticos
- ✅ Acceso desde cualquier ubicación
- ✅ Compatible con despliegue en Vercel

**Archivos Modificados**:
- `.env` - Actualizada DATABASE_URL para usar Neon
- `.env.neon` - Mantiene configuraciones de Neon

---

### 📚 Documentación

**Archivos Actualizados**:
- `ROADMAP.md` - Marcada Etapa 3 de Feature 2 como COMPLETADA
  - Inventario de Repuestos completado
  - Agregada sección de migración a Neon
- `CHANGELOG.md` - Nuevo sprint documentado con todas las características

---

### 🔧 Mejoras Técnicas

#### Transacciones Prisma
Implementación de transacciones atómicas para garantizar consistencia:
```typescript
await prisma.$transaction([
    prisma.partUsage.create({ ... }),
    prisma.part.update({
        data: { quantity: part.quantity - quantity }
    })
]);
```

#### Validaciones de Negocio
- Verificación de stock disponible antes de asignar
- Prevención de números negativos en cantidades
- Cálculo automático de márgenes y totales
- Validación de permisos por rol

#### Optimizaciones
- Queries con includes optimizados
- Ordenamiento en base de datos
- Filtrado de repuestos por stock disponible

---

### 🎯 Próximos Pasos Sugeridos

#### Alta Prioridad
1. **Notificaciones por Email**
   - Configurar servicio de email (Resend/SendGrid)
   - Templates de email profesionales
   - Notificaciones automáticas al cambiar estado
   - Envío de PDFs por email

2. **Mejoras en Inventario**
   - Historial de movimientos de stock
   - Reportes de uso de repuestos
   - Alertas automáticas de stock bajo
   - Importación/Exportación de catálogo

#### Media Prioridad
3. **Integración WhatsApp**
   - API de WhatsApp Business
   - Notificaciones push
   - Aprobación de presupuestos vía WhatsApp

4. **Dashboard de Finanzas**
   - Módulo de caja
   - Reportes de ganancias
   - Gráficos de ingresos/egresos

---

### 📊 Estadísticas del Sprint

**Tiempo de Implementación**: ~3 horas
**Archivos Creados**: 6
**Archivos Modificados**: 4
**Líneas de Código**: ~850
**Server Actions Nuevas**: 5

**Funcionalidades Completadas**:
- ✅ CRUD completo de repuestos
- ✅ Control de stock con transacciones
- ✅ Asignación de repuestos a tickets
- ✅ Cálculo automático de costos y márgenes
- ✅ Migración a Neon PostgreSQL
- ✅ Seed de datos completo

---

### 🐛 Problemas Conocidos

Ninguno reportado hasta el momento.

---

### 💡 Notas de Desarrollo

#### Lecciones Aprendidas
1. **Transacciones Prisma** son esenciales para operaciones que afectan múltiples tablas
2. **Neon PostgreSQL** ofrece una excelente alternativa a bases de datos locales
3. **Validaciones en cliente y servidor** proporcionan mejor UX y seguridad
4. **Cálculos automáticos** mejoran la precisión y reducen errores humanos

#### Decisiones de Diseño
1. **Stock mínimo de 5**: Umbral para alertas de stock bajo
2. **Transacciones atómicas**: Garantizan consistencia de stock
3. **Protección de eliminación**: No se pueden eliminar repuestos en uso
4. **Cálculo de margen**: Mostrado en % y valor absoluto para mejor comprensión

---

---

## [Sprint 2025-12-09] - Sistema de PDFs y Mejoras de Búsqueda

### ✨ Nuevas Funcionalidades

#### 1. Sistema de Generación de PDFs 📄
**Descripción**: Sistema completo de generación de documentos PDF profesionales para tickets.

**Implementación**:
- Instalación de `@react-pdf/renderer` para generación de PDFs
- Creación de templates profesionales con diseño personalizado
- API routes seguros con autenticación y validación de permisos
- Integración en la UI con botones de descarga

**Características**:

##### Orden de Ingreso (Work Order)
- **Ruta**: `/api/tickets/[id]/pdf/work-order`
- **Disponibilidad**: Todos los tickets (cualquier estado)
- **Contenido**:
  - Encabezado con nombre del taller y número de orden
  - Datos completos del cliente (nombre, teléfono, email, dirección)
  - Información del equipo (dispositivo, prioridad, estado)
  - Técnico asignado
  - Falla reportada (descripción completa)
  - Condiciones del servicio (4 puntos clave)
  - Sección de firmas de conformidad (cliente y técnico)
  - Footer con información del sistema
- **Diseño**: Paleta azul profesional (#2563eb)
- **Formato**: A4, optimizado para impresión

##### Comprobante de Entrega (Delivery Receipt)
- **Ruta**: `/api/tickets/[id]/pdf/delivery-receipt`
- **Disponibilidad**: Solo tickets con estado RESOLVED o CLOSED
- **Contenido**:
  - Encabezado con badge de "Reparación Completada"
  - Resumen destacado (tiempo de reparación, estado final, técnico)
  - Datos del cliente
  - Información del equipo y fechas
  - Problema reportado inicial
  - Trabajo realizado (hasta 5 notas más recientes de la bitácora)
  - Condiciones de entrega y garantía (4 puntos)
  - Sección de firmas de conformidad
  - Mensaje de agradecimiento
- **Diseño**: Paleta verde de éxito (#10b981)
- **Formato**: A4, optimizado para impresión

**Seguridad**:
- ✅ Autenticación requerida (NextAuth)
- ✅ Validación de permisos multi-tenant
- ✅ Super admin puede acceder a todos los tickets
- ✅ Usuarios regulares solo ven tickets de su tenant
- ✅ Validación de estado para comprobante de entrega

**UI/UX**:
- Botones integrados en la página de detalle del ticket
- Sección "Documentos" en la columna derecha
- Botón de orden de ingreso siempre visible
- Botón de comprobante solo visible cuando el ticket está completado
- Descarga/apertura en nueva pestaña
- Iconos intuitivos (📄 para orden, ✓ para comprobante)

**Archivos Creados**:
```
src/components/pdf/
├── WorkOrderPDF.tsx              # Template de orden de ingreso
└── DeliveryReceiptPDF.tsx        # Template de comprobante de entrega

src/app/api/tickets/[id]/pdf/
├── work-order/route.ts           # API para orden de ingreso
└── delivery-receipt/route.ts     # API para comprobante de entrega
```

**Archivos Modificados**:
- `src/app/dashboard/tickets/[id]/TicketDetailView.tsx` - Agregados botones de descarga
- `package.json` - Agregada dependencia @react-pdf/renderer

---

#### 2. Sistema de Comentarios/Notas ✅
**Estado**: Ya estaba implementado, verificado y documentado.

**Características**:
- Modelo `TicketNote` en base de datos
- Server actions para agregar y eliminar notas
- UI completa en página de detalle del ticket
- Permisos: solo autor o admin pueden eliminar
- Ordenamiento cronológico (más recientes primero)
- Actualización automática del ticket al agregar nota

---

#### 3. Buscador Global de Tickets ✅
**Estado**: Ya estaba implementado, verificado y documentado.

**Características**:
- Búsqueda por ID de ticket (completo o parcial)
- Búsqueda por título del ticket
- Búsqueda por nombre del cliente
- Filtros avanzados:
  - Estado (OPEN, IN_PROGRESS, etc.)
  - Prioridad (LOW, MEDIUM, HIGH, URGENT)
  - Asignado a (por email del técnico)
- Debouncing para mejor rendimiento
- Indicador de resultados encontrados
- Botón de limpiar filtros

---

### 📚 Documentación

**Archivos Creados**:
- `PDF_IMPLEMENTATION.md` - Documentación completa del sistema de PDFs
  - Descripción de características
  - Estructura de archivos
  - Guía de uso
  - Troubleshooting
  - Próximas mejoras sugeridas

**Archivos Actualizados**:
- `ROADMAP.md` - Actualizado Feature 2 como EN PROGRESO
  - Marcada Etapa 1 como COMPLETADA
  - Actualizadas tareas prioritarias
  - Agregada sección de tareas completadas recientemente

---

### 🔧 Mejoras Técnicas

#### Instalaciones
```bash
npm install @react-pdf/renderer
```

#### Configuración
- Configuradas rutas API con manejo de errores
- Implementado streaming de PDFs para mejor rendimiento
- Validación de estados de tickets

---

### 🎯 Próximos Pasos Sugeridos

#### Alta Prioridad
1. **Mejoras en Dashboard**
   - Gráficos de tickets por estado
   - Métricas de productividad por técnico
   - Widget de tickets urgentes
   - Filtros por rango de fechas

2. **Notificaciones por Email**
   - Configurar servicio de email (Resend/SendGrid)
   - Templates de email profesionales
   - Notificaciones automáticas al cambiar estado
   - Opción de enviar PDFs por email adjunto

#### Media Prioridad
3. **Inventario de Repuestos**
   - CRUD completo de repuestos
   - Asignación de repuestos a tickets
   - Control de stock
   - Alertas de stock bajo
   - Cálculo automático de costos

4. **Mejoras en PDFs**
   - Logo del taller en header
   - Código QR con ID del ticket
   - Incluir repuestos en comprobante
   - Mostrar costos y total
   - Preview del PDF antes de descargar

#### Baja Prioridad
5. **Integraciones**
   - WhatsApp API para notificaciones
   - Sistema de aprobación de presupuestos
   - Firma digital en PDFs

---

### 📊 Estadísticas del Sprint

**Tiempo de Implementación**: ~2 horas
**Archivos Creados**: 4
**Archivos Modificados**: 3
**Líneas de Código**: ~800
**Documentación**: 2 archivos nuevos, 1 actualizado

**Funcionalidades Completadas**:
- ✅ Sistema de Generación de PDFs (2 tipos)
- ✅ Verificación de Sistema de Comentarios
- ✅ Verificación de Buscador Global
- ✅ Documentación completa

---

### 🐛 Problemas Conocidos

Ninguno reportado hasta el momento.

---

### 💡 Notas de Desarrollo

#### Lecciones Aprendidas
1. **@react-pdf/renderer** es una excelente librería para generar PDFs desde React
2. El uso de streams mejora el rendimiento al enviar PDFs grandes
3. La validación de permisos en cada endpoint es crucial para seguridad
4. Los PDFs deben optimizarse para impresión (tamaño A4, márgenes adecuados)

#### Decisiones de Diseño
1. **Colores diferenciados**: Azul para orden de ingreso, Verde para comprobante
2. **Botones condicionales**: Comprobante solo visible para tickets completados
3. **Apertura en nueva pestaña**: Mejor UX que descarga forzada
4. **Límite de notas**: Solo 5 notas más recientes en comprobante para evitar PDFs muy largos

---

### 🎨 Diseño y UX

#### Mejoras Visuales
- Botones con iconos para mejor identificación
- Colores consistentes con el estado del ticket
- Diseño responsive en la sección de documentos
- PDFs con diseño profesional y limpio

#### Accesibilidad
- Botones con texto descriptivo
- Colores con contraste adecuado
- Estructura semántica en PDFs

---

## Versiones Anteriores

### [Sprint Anterior] - Feature 1: Gestión Core de Taller (MVP)
- ✅ Configuración del proyecto
- ✅ Base de datos y Prisma ORM
- ✅ Autenticación con NextAuth v5
- ✅ Multi-tenancy
- ✅ Roles y permisos
- ✅ Módulos de usuarios, clientes y tickets
- ✅ Dashboard principal
- ✅ Portal público de consulta
- ✅ Mejoras de UI/UX

Ver `ROADMAP.md` para detalles completos.
