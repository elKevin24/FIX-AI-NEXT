# 🎯 Hoja de Ruta: Sistema de Plantillas de Servicio

**Fecha de Creación:** 10 de Diciembre, 2025
**Estado:** Planificación
**Versión Objetivo:** 2.5 (Post Workflow v2.0)
**Prioridad:** Media-Alta

---

## 📋 Visión General

### Objetivo
Implementar un **sistema de plantillas de servicio predeterminadas** que permita a los talleres:
- Estandarizar servicios comunes (mantenimientos, reparaciones típicas, instalaciones)
- Agilizar la creación de tickets con configuraciones pre-definidas
- Establecer precios y procedimientos consistentes
- Mejorar la experiencia del usuario al reducir trabajo repetitivo

### Problema que Resuelve
**Situación Actual:**
- Recepcionistas/técnicos escriben manualmente cada detalle del servicio
- Inconsistencias en nombres de servicios similares
- Dificultad para mantener precios estandarizados
- No hay checklist de procedimientos para servicios comunes

**Solución Propuesta:**
Sistema de plantillas que permite seleccionar "Mantenimiento Preventivo Básico" y automáticamente:
- Rellena título, descripción, checklist de tareas
- Pre-carga repuestos comúnmente usados (opcional)
- Establece precio base de mano de obra
- Define prioridad y tiempo estimado

---

## 🏗️ Arquitectura del Sistema

### Nuevas Entidades de Base de Datos

#### 1. `ServiceTemplate` (Plantilla de Servicio)
```prisma
model ServiceTemplate {
  id          String   @id @default(uuid())
  name        String   // "Mantenimiento Preventivo Básico"
  description String   // Descripción detallada del servicio
  category    ServiceCategory @default(MAINTENANCE)

  // Configuración predeterminada
  defaultTitle       String?   // Título sugerido para el ticket
  defaultDescription String?   // Descripción larga (checklist de tareas)
  defaultPriority    String?   @default("Medium") // Low, Medium, High, URGENT

  // Precios y tiempos
  laborCost          Decimal?  @db.Decimal(10, 2) // Costo de mano de obra
  estimatedDuration  Int?      // Minutos estimados

  // Metadatos
  isActive           Boolean   @default(true)
  displayOrder       Int       @default(0) // Para ordenar en UI
  icon               String?   // Emoji o nombre de icono
  color              String?   @default("#3B82F6") // Color para UI

  // Multi-tenancy
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id])

  // Relaciones
  defaultParts TemplatePartDefault[]
  tickets      Ticket[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("service_templates")
  @@index([tenantId, category, isActive])
}

enum ServiceCategory {
  MAINTENANCE      // Mantenimientos preventivos/correctivos
  REPAIR          // Reparaciones específicas
  INSTALLATION    // Instalación de software/hardware
  UPGRADE         // Mejoras de componentes
  DIAGNOSTIC      // Diagnósticos sin reparación
  CUSTOM          // Servicios personalizados
}
```

#### 2. `TemplatePartDefault` (Repuestos por Defecto en Plantilla)
```prisma
model TemplatePartDefault {
  id         String  @id @default(uuid())
  quantity   Int     @default(1)
  isOptional Boolean @default(false) // Si es opcional o siempre se usa

  templateId String
  template   ServiceTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)

  partId String
  part   Part   @relation(fields: [partId], references: [id])

  createdAt DateTime @default(now())

  @@map("template_part_defaults")
  @@unique([templateId, partId])
}
```

#### 3. Actualización de `Ticket`
```prisma
model Ticket {
  // ... campos existentes ...

  // Nueva relación con plantilla
  serviceTemplateId String?
  serviceTemplate   ServiceTemplate? @relation(fields: [serviceTemplateId], references: [id])

  // Nuevo campo para diferenciar tipos de servicio
  serviceType String? @default("REPAIR")
  // Valores: REPAIR, MAINTENANCE, UPGRADE, INSTALLATION, DIAGNOSTIC
}
```

---

## 📦 Plantillas Predefinidas (Catálogo Inicial)

### Categoría: MAINTENANCE (Mantenimientos)

#### 1. Mantenimiento Preventivo Básico
```yaml
nombre: "Mantenimiento Preventivo Básico"
categoría: MAINTENANCE
título_default: "Mantenimiento preventivo - [Modelo del equipo]"
descripción: |
  ✅ Limpieza física interna y externa
  ✅ Limpieza de ventiladores y disipadores
  ✅ Actualización de sistema operativo
  ✅ Actualización de drivers
  ✅ Escaneo de malware/antivirus
  ✅ Optimización de inicio
  ✅ Desfragmentación/Optimización de disco
  ✅ Verificación de temperaturas
  ✅ Backup de datos (opcional)
prioridad: "Low"
costo_mano_obra: $25.00
duración_estimada: 90 minutos
repuestos_default:
  - Limpiador de contactos (opcional)
  - Alcohol isopropílico (opcional)
color: "#10B981"
icono: "🔧"
```

#### 2. Mantenimiento Preventivo Premium
```yaml
nombre: "Mantenimiento Preventivo Premium"
categoría: MAINTENANCE
título_default: "Mantenimiento premium - [Modelo del equipo]"
descripción: |
  ✅ Todo lo del mantenimiento básico +
  ✅ Reemplazo de pasta térmica
  ✅ Limpieza profunda de teclado
  ✅ Calibración de batería
  ✅ Optimización de energía
  ✅ Instalación de actualizaciones críticas
  ✅ Pruebas de stress (CPU/GPU/RAM)
  ✅ Informe de diagnóstico completo
prioridad: "Medium"
costo_mano_obra: $45.00
duración_estimada: 150 minutos
repuestos_default:
  - Pasta térmica Arctic MX-4 (siempre)
  - Limpiador de contactos (siempre)
color: "#8B5CF6"
icono: "⭐"
```

#### 3. Limpieza Rápida
```yaml
nombre: "Limpieza Express"
categoría: MAINTENANCE
título_default: "Limpieza rápida"
descripción: |
  ✅ Limpieza externa del equipo
  ✅ Limpieza de pantalla
  ✅ Limpieza de teclado/mouse
  ✅ Limpieza básica de ventiladores
  ✅ Verificación rápida de funcionamiento
prioridad: "Low"
costo_mano_obra: $15.00
duración_estimada: 30 minutos
repuestos_default: []
color: "#06B6D4"
icono: "✨"
```

---

### Categoría: REPAIR (Reparaciones Comunes)

#### 4. Reemplazo de Display/Pantalla
```yaml
nombre: "Reemplazo de Pantalla"
categoría: REPAIR
título_default: "Reemplazo de pantalla - [Modelo]"
descripción: |
  ⚠️ Problema: Pantalla rota/estrellada/sin imagen

  Procedimiento:
  ✅ Diagnóstico de daño (táctil, LCD, digitalizador)
  ✅ Desarme cuidadoso del equipo
  ✅ Extracción de pantalla dañada
  ✅ Instalación de pantalla nueva
  ✅ Pruebas de táctil y visualización
  ✅ Calibración (si aplica)
  ✅ Ensamble final
prioridad: "High"
costo_mano_obra: $35.00
duración_estimada: 120 minutos
repuestos_default:
  - Display compatible (obligatorio - se especifica al crear ticket)
color: "#EF4444"
icono: "📱"
```

#### 5. Reemplazo de Batería
```yaml
nombre: "Reemplazo de Batería"
categoría: REPAIR
título_default: "Reemplazo de batería - [Modelo]"
descripción: |
  ⚠️ Problema: Batería no carga/agotada/hinchada

  Procedimiento:
  ✅ Diagnóstico de salud de batería
  ✅ Desarme seguro del equipo
  ✅ Desconexión de batería antigua
  ✅ Instalación de batería nueva
  ✅ Calibración de batería
  ✅ Pruebas de carga (30+ minutos)
  ✅ Verificación de autonomía
prioridad: "High"
costo_mano_obra: $25.00
duración_estimada: 90 minutos
repuestos_default:
  - Batería compatible (obligatorio - se especifica al crear ticket)
color: "#F59E0B"
icono: "🔋"
```

#### 6. Eliminación de Virus/Malware
```yaml
nombre: "Limpieza de Virus/Malware"
categoría: REPAIR
título_default: "Eliminación de virus/malware"
descripción: |
  ⚠️ Problema: Equipo lento, pop-ups, comportamiento extraño

  Procedimiento:
  ✅ Arranque en modo seguro
  ✅ Escaneo completo con antivirus
  ✅ Eliminación de malware detectado
  ✅ Limpieza de navegadores
  ✅ Eliminación de extensiones maliciosas
  ✅ Restauración de configuración de sistema
  ✅ Instalación de antivirus actualizado
  ✅ Educación al cliente (prevención)
prioridad: "Medium"
costo_mano_obra: $30.00
duración_estimada: 120 minutos
repuestos_default: []
color: "#DC2626"
icono: "🦠"
```

---

### Categoría: UPGRADE (Mejoras)

#### 7. Instalación de SSD
```yaml
nombre: "Upgrade a SSD"
categoría: UPGRADE
título_default: "Instalación de SSD - [Capacidad]"
descripción: |
  🚀 Mejora: Reemplazo de HDD por SSD

  Procedimiento:
  ✅ Backup completo de datos del cliente
  ✅ Desarme del equipo
  ✅ Instalación física del SSD
  ✅ Clonación del sistema operativo
  ✅ Verificación de arranque
  ✅ Optimización de SSD (TRIM, AHCI)
  ✅ Pruebas de velocidad
  ✅ Restauración de datos
prioridad: "Medium"
costo_mano_obra: $40.00
duración_estimada: 180 minutos
repuestos_default:
  - SSD [capacidad a definir] (obligatorio)
  - Cable SATA (opcional)
color: "#10B981"
icono: "💾"
```

#### 8. Expansión de RAM
```yaml
nombre: "Upgrade de Memoria RAM"
categoría: UPGRADE
título_default: "Instalación de RAM - [Cantidad]GB"
descripción: |
  🚀 Mejora: Aumento de memoria RAM

  Procedimiento:
  ✅ Verificación de compatibilidad
  ✅ Desarme del equipo
  ✅ Instalación de módulos RAM
  ✅ Verificación en BIOS
  ✅ Pruebas de estabilidad (MemTest)
  ✅ Ensamble final
  ✅ Benchmarks de rendimiento
prioridad: "Low"
costo_mano_obra: $20.00
duración_estimada: 45 minutos
repuestos_default:
  - Módulo RAM [especificación a definir] (obligatorio)
color: "#6366F1"
icono: "🎯"
```

---

### Categoría: INSTALLATION (Instalaciones)

#### 9. Instalación de Sistema Operativo
```yaml
nombre: "Instalación de Windows/Linux"
categoría: INSTALLATION
título_default: "Instalación de [SO]"
descripción: |
  💿 Servicio: Instalación limpia de sistema operativo

  Procedimiento:
  ✅ Backup de datos importantes (si aplica)
  ✅ Creación de medio de instalación
  ✅ Formateo e instalación del SO
  ✅ Instalación de drivers
  ✅ Actualización del sistema
  ✅ Instalación de software básico
  ✅ Configuración de usuario
  ✅ Restauración de datos (si aplica)
prioridad: "Medium"
costo_mano_obra: $35.00
duración_estimada: 150 minutos
repuestos_default: []
color: "#0EA5E9"
icono: "💻"
```

#### 10. Instalación de Paquete Office
```yaml
nombre: "Instalación de Office/Software"
categoría: INSTALLATION
título_default: "Instalación de software empresarial"
descripción: |
  📦 Servicio: Instalación y configuración de software

  Procedimiento:
  ✅ Verificación de requisitos del sistema
  ✅ Instalación de Microsoft Office / LibreOffice
  ✅ Activación de licencias
  ✅ Configuración de cuentas
  ✅ Sincronización de OneDrive/Cloud
  ✅ Instalación de plugins necesarios
  ✅ Tutorial básico al cliente
prioridad: "Low"
costo_mano_obra: $20.00
duración_estimada: 60 minutos
repuestos_default: []
color: "#14B8A6"
icono: "📄"
```

---

### Categoría: DIAGNOSTIC (Diagnósticos)

#### 11. Diagnóstico Completo sin Reparación
```yaml
nombre: "Diagnóstico Técnico Completo"
categoría: DIAGNOSTIC
título_default: "Diagnóstico completo - [Síntomas]"
descripción: |
  🔍 Servicio: Evaluación técnica sin compromiso de reparación

  Procedimiento:
  ✅ Entrevista con cliente (síntomas)
  ✅ Inspección visual (golpes, líquidos)
  ✅ Pruebas de arranque
  ✅ Diagnóstico de hardware (CPU, RAM, disco)
  ✅ Diagnóstico de software (SO, drivers)
  ✅ Medición de temperaturas
  ✅ Informe detallado escrito
  ✅ Presupuesto de reparación (si aplica)

  ⚠️ Nota: Cliente decide si autoriza reparación después
prioridad: "Medium"
costo_mano_obra: $25.00
duración_estimada: 60 minutos
repuestos_default: []
color: "#64748B"
icono: "🔬"
```

---

## 🛠️ Plan de Implementación

### **FASE 1: Fundamentos de Datos** (1-2 días)
**Objetivo:** Crear la estructura de base de datos

#### Tareas:
- [ ] **1.1** Diseñar esquema Prisma completo
  - Modelo `ServiceTemplate`
  - Modelo `TemplatePartDefault`
  - Enum `ServiceCategory`
  - Actualización de modelo `Ticket` (agregar `serviceTemplateId`, `serviceType`)

- [ ] **1.2** Crear migración de base de datos
  ```bash
  npx prisma migrate dev --name add_service_templates
  ```

- [ ] **1.3** Actualizar tipos TypeScript
  - Regenerar Prisma Client
  - Crear tipos para DTOs de plantillas

- [ ] **1.4** Crear esquemas Zod
  - `CreateServiceTemplateSchema`
  - `UpdateServiceTemplateSchema`
  - `ServiceTemplateFilterSchema`

**Entregables:**
- ✅ Schema Prisma actualizado
- ✅ Migración ejecutada
- ✅ Tipos TypeScript generados
- ✅ Esquemas Zod listos

---

### **FASE 2: Seed de Plantillas Iniciales** (1 día)
**Objetivo:** Poblar la base de datos con plantillas predefinidas

#### Tareas:
- [ ] **2.1** Crear script de seed para plantillas
  - Ubicación: `prisma/seeds/service-templates.ts`
  - Incluir las 11 plantillas definidas arriba

- [ ] **2.2** Relacionar plantillas con repuestos comunes
  - Pasta térmica → Mantenimiento Premium
  - SSD, RAM → Upgrades
  - Displays, baterías → Reparaciones

- [ ] **2.3** Ejecutar seed
  ```bash
  npm run db:seed:templates
  ```

**Entregables:**
- ✅ Script de seed funcional
- ✅ 11 plantillas creadas en DB
- ✅ Relaciones con repuestos establecidas

---

### **FASE 3: Backend - Server Actions** (2-3 días)
**Objetivo:** Crear lógica de negocio para plantillas

#### Tareas:
- [ ] **3.1** CRUD de Service Templates
  - `createServiceTemplate()`
  - `updateServiceTemplate()`
  - `deleteServiceTemplate()`
  - `getServiceTemplates()` - con filtros por categoría
  - `getServiceTemplateById()`

- [ ] **3.2** Acciones de aplicación de plantillas
  - `createTicketFromTemplate(templateId, customerData, overrides)`
    - Crea ticket basado en plantilla
    - Permite sobrescribir valores (título, descripción)
    - Opcionalmente agrega repuestos default
    - Calcula costo inicial (labor + partes)

- [ ] **3.3** Validaciones y permisos
  - Solo ADMIN puede crear/editar/eliminar plantillas
  - Todos los roles pueden usar plantillas al crear tickets
  - Tenant isolation en todas las consultas

**Entregables:**
- ✅ Server Actions en `src/lib/actions/service-templates.ts`
- ✅ Validación Zod en todas las acciones
- ✅ Audit Log para cambios en plantillas

---

### **FASE 4: Frontend - Gestión de Plantillas (Admin)** (2-3 días)
**Objetivo:** Interfaz para administrar plantillas

#### Tareas:
- [ ] **4.1** Página de listado de plantillas
  - Ruta: `/dashboard/settings/service-templates`
  - Tabla con todas las plantillas
  - Filtros por categoría
  - Indicador de activo/inactivo
  - Botones: Crear, Editar, Eliminar, Activar/Desactivar

- [ ] **4.2** Formulario de creación/edición
  - Ruta: `/dashboard/settings/service-templates/create`
  - Ruta: `/dashboard/settings/service-templates/[id]/edit`
  - Campos:
    - Nombre, descripción
    - Categoría (dropdown)
    - Título/descripción default
    - Prioridad default
    - Costo de mano de obra
    - Duración estimada
    - Repuestos default (multi-select con partes)
    - Color, icono
    - Orden de visualización

- [ ] **4.3** Vista previa de plantilla
  - Mostrar cómo se vería el ticket generado
  - Lista de repuestos que se agregarían
  - Costo estimado total

**Entregables:**
- ✅ Página de gestión de plantillas
- ✅ Formularios de creación/edición
- ✅ Validación client-side
- ✅ Mensajes de éxito/error

---

### **FASE 5: Frontend - Uso de Plantillas al Crear Tickets** (3-4 días)
**Objetivo:** Integrar plantillas en el flujo de creación de tickets

#### Tareas:
- [ ] **5.1** Actualizar `TicketWizard`
  - Agregar **Paso 0 (Opcional)**: "Seleccionar Plantilla"
  - Grid de cards con plantillas agrupadas por categoría
  - Al seleccionar plantilla:
    - Auto-rellenar título, descripción
    - Pre-establecer prioridad
    - Sugerir repuestos (editables)
    - Mostrar costo estimado

- [ ] **5.2** Modo híbrido: Plantilla + Personalización
  - Usuario puede seleccionar plantilla Y modificar campos
  - Botón "Limpiar plantilla" para empezar desde cero
  - Indicador visual: "Basado en: [Nombre de Plantilla]"

- [ ] **5.3** Botón rápido en listado de tickets
  - Botón "Crear desde plantilla" en `/dashboard/tickets`
  - Modal que permite seleccionar plantilla y cliente
  - Crea ticket en 2 clics

**Entregables:**
- ✅ Wizard actualizado con selector de plantillas
- ✅ Auto-relleno de campos
- ✅ Creación rápida de tickets

---

### **FASE 6: Reportes y Analytics** (2 días)
**Objetivo:** Métricas sobre uso de plantillas

#### Tareas:
- [ ] **6.1** Dashboard de plantillas
  - Ruta: `/dashboard/analytics/service-templates`
  - Gráfico: Servicios más solicitados (por plantilla)
  - Gráfico: Ingresos por categoría de servicio
  - Tabla: Tiempo promedio real vs estimado por plantilla

- [ ] **6.2** Métricas en listado de plantillas
  - Columna: "Tickets creados" (contador)
  - Columna: "Última vez usada"
  - Badge: "Popular" si >10 usos en último mes

**Entregables:**
- ✅ Dashboard de analytics
- ✅ Métricas en tiempo real
- ✅ Exportación de reportes

---

### **FASE 7: Mejoras Avanzadas (Opcional)** (3-5 días)
**Objetivo:** Features premium

#### Tareas:
- [ ] **7.1** Plantillas personalizadas por cliente
  - Cliente frecuente que siempre pide el mismo servicio
  - Guardar como "Plantilla Personal" con sus preferencias

- [ ] **7.2** Versionado de plantillas
  - Historial de cambios en plantillas
  - Tickets antiguos mantienen versión original

- [ ] **7.3** Plantillas con checklist interactivo
  - Convertir descripción en checklist con checkboxes
  - Técnico marca tareas completadas
  - Progreso visual: "4/8 tareas completadas"

- [ ] **7.4** Precios dinámicos
  - Precio varía según modelo de equipo
  - Ej: "Cambio de pantalla iPhone 13: $250, iPhone 15: $350"

- [ ] **7.5** Plantillas multi-tenant compartidas
  - Biblioteca de plantillas "oficiales" de FIX-AI
  - Talleres pueden importar y personalizar

**Entregables:**
- ✅ Features avanzadas implementadas
- ✅ Documentación de uso

---

## 📊 Estimación de Esfuerzo

| Fase | Tiempo Estimado | Complejidad |
|------|----------------|-------------|
| Fase 1: Fundamentos de Datos | 1-2 días | Media |
| Fase 2: Seed de Plantillas | 1 día | Baja |
| Fase 3: Backend - Server Actions | 2-3 días | Media |
| Fase 4: Frontend - Gestión Admin | 2-3 días | Media |
| Fase 5: Frontend - Uso en Tickets | 3-4 días | Alta |
| Fase 6: Reportes y Analytics | 2 días | Media |
| Fase 7: Mejoras Avanzadas | 3-5 días | Alta |
| **TOTAL (Sin Fase 7)** | **11-15 días** | - |
| **TOTAL (Con Fase 7)** | **14-20 días** | - |

**Recomendación:** Implementar Fases 1-6 primero (MVP de plantillas), Fase 7 en iteración posterior.

---

## 🎯 Criterios de Éxito

### Funcionales
- ✅ Al menos 10 plantillas predefinidas disponibles
- ✅ Admins pueden crear/editar/eliminar plantillas
- ✅ Creación de tickets desde plantilla en <3 clics
- ✅ Auto-relleno de campos funciona correctamente
- ✅ Repuestos default se agregan automáticamente (opcional)

### No Funcionales
- ✅ Tiempo de carga del selector de plantillas <500ms
- ✅ UI responsive (móvil, tablet, desktop)
- ✅ 100% de cobertura de tenant isolation
- ✅ Validación Zod en todos los formularios

### UX
- ✅ Recepcionistas reportan 50%+ reducción en tiempo de creación de tickets comunes
- ✅ Consistencia en nomenclatura de servicios
- ✅ Clientes entienden mejor qué incluye cada servicio

---

## 🔗 Integración con Roadmap Existente

**Ubicación en ROADMAP.md:** Entre **Feature 2** (Operaciones Esenciales) y **Feature 3** (Administración Avanzada)

**Nueva entrada:**
```markdown
## Feature 2.5: Sistema de Plantillas de Servicio - [PLANIFICADO]
**Objetivo:** Estandarizar servicios comunes y agilizar la creación de tickets.

### Etapa 1: Fundamentos ⏳ PRÓXIMO
- [ ] Modelo de datos para Service Templates
- [ ] Seed con 10+ plantillas predefinidas
- [ ] Server Actions CRUD

### Etapa 2: Interfaz de Gestión ⏳
- [ ] Página de administración de plantillas (Admin)
- [ ] Formularios de creación/edición
- [ ] Activar/Desactivar plantillas

### Etapa 3: Uso en Creación de Tickets ⏳
- [ ] Integración en TicketWizard
- [ ] Selector visual de plantillas
- [ ] Auto-relleno de campos
- [ ] Creación rápida desde plantilla

### Etapa 4: Analytics ⏳
- [ ] Métricas de uso de plantillas
- [ ] Reportes de servicios más solicitados
```

---

## 🚀 Próximos Pasos

### Inmediatos (Esta Semana)
1. ✅ Revisar y aprobar esta hoja de ruta
2. ⏳ Crear rama de desarrollo: `feature/service-templates`
3. ⏳ Comenzar Fase 1: Diseño de schema Prisma

### Corto Plazo (Próximas 2 Semanas)
4. ⏳ Completar Fases 1-3 (Backend completo)
5. ⏳ Testing de Server Actions
6. ⏳ Documentación de API

### Medio Plazo (Mes 1)
7. ⏳ Completar Fases 4-6 (Frontend + Analytics)
8. ⏳ Testing E2E del flujo completo
9. ⏳ Deployment a staging
10. ⏳ Feedback de usuarios beta

---

## 📚 Referencias

- [ROADMAP.md](./ROADMAP.md) - Roadmap general del proyecto
- [FEATURES_V2_WORKFLOW.md](./FEATURES_V2_WORKFLOW.md) - Workflow v2.0 (multi-dispositivo)
- [prisma/schema.prisma](./prisma/schema.prisma) - Schema actual de datos
- [src/app/dashboard/tickets/create/TicketWizard.tsx](./src/app/dashboard/tickets/create/TicketWizard.tsx) - Wizard actual

---

**Última Actualización:** 10 de Diciembre, 2025
**Autor:** Equipo FIX-AI-NEXT
**Estado:** 📋 Pendiente de Aprobación
