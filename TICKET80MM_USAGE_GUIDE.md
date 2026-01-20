# Guía de Uso: Ticket80mm

## 📋 Descripción

Refactorización profesional de componente de ticket optimizado para impresión térmica de 80mm, siguiendo las reglas estrictas de:

1. **Adaptación al Modelo de Datos**: Usa interfaces TypeScript basadas en tu schema Prisma existente
2. **UI Ultra-Minimalista**: Diseño de alta densidad sin aire excesivo
3. **Tipografía Dual**: Labels normales + Datos en Monospace (JetBrains Mono/Geist Mono)
4. **Funcionalidad de Exportación**: Descarga como Imagen/PDF, Web Share API, Impresión optimizada

---

## 🗂️ Archivos Creados

```
/src
├── /types
│   └── ticket80mm.ts                          # Interfaces TypeScript basadas en Prisma
├── /components
│   └── /tickets
│       ├── Ticket80mm.tsx                     # Componente de ticket 80mm
│       ├── Ticket80mm.module.css              # Estilos ultra-minimalistas
│       ├── TicketActions.tsx                  # Wrapper de gestión
│       └── TicketActions.module.css           # Estilos del wrapper
```

---

## 🚀 Uso Básico

### 1. Importar el componente

```tsx
import TicketActions from '@/components/tickets/TicketActions';
import { Ticket80mmData } from '@/types/ticket80mm';
```

### 2. Preparar los datos

El componente usa las interfaces basadas en tu modelo Prisma. Aquí está cómo mapear los datos:

```tsx
'use client';

import TicketActions from '@/components/tickets/TicketActions';
import { Ticket80mmData } from '@/types/ticket80mm';

// Ejemplo con datos del ticket desde tu API/Prisma
const MyTicketPage = ({ ticket }) => {
    // Los datos ya vienen con la estructura correcta de Prisma
    const ticketData: Ticket80mmData = {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        deviceType: ticket.deviceType,
        deviceModel: ticket.deviceModel,
        serialNumber: ticket.serialNumber,
        accessories: ticket.accessories,
        checkInNotes: ticket.checkInNotes,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        estimatedCompletionDate: ticket.estimatedCompletionDate,
        dueDate: ticket.dueDate,
        customer: {
            id: ticket.customer.id,
            name: ticket.customer.name,
            email: ticket.customer.email,
            phone: ticket.customer.phone,
            dpi: ticket.customer.dpi,
            nit: ticket.customer.nit,
        },
        tenant: {
            id: ticket.tenant.id,
            name: ticket.tenant.name,
        },
        assignedTo: ticket.assignedTo ? {
            id: ticket.assignedTo.id,
            name: ticket.assignedTo.name,
            email: ticket.assignedTo.email,
        } : null,
        partsUsed: ticket.partsUsed?.map(pu => ({
            id: pu.id,
            quantity: pu.quantity,
            part: {
                id: pu.part.id,
                name: pu.part.name,
                sku: pu.part.sku,
                cost: pu.part.cost,
                price: pu.part.price,
                category: pu.part.category,
            },
        })),
        services: ticket.services?.map(s => ({
            id: s.id,
            name: s.name,
            laborCost: s.laborCost,
        })),
    };

    return (
        <div>
            <h1>Orden de Servicio</h1>

            <TicketActions
                ticket={ticketData}
                showParts={true}
                showServices={true}
                showCostSummary={true}
                onDownloadStart={() => console.log('Iniciando descarga...')}
                onDownloadComplete={() => console.log('Descarga completa')}
                onError={(error) => console.error('Error:', error)}
            />
        </div>
    );
};

export default MyTicketPage;
```

---

## 🎨 Propiedades del Componente

### `TicketActions` Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `ticket` | `Ticket80mmData` | **Requerido** | Datos del ticket basados en Prisma schema |
| `showParts` | `boolean` | `true` | Mostrar sección de repuestos |
| `showServices` | `boolean` | `true` | Mostrar sección de servicios |
| `showCostSummary` | `boolean` | `true` | Mostrar resumen de costos |
| `showQR` | `boolean` | `true` | Mostrar código QR para consulta de estado |
| `baseUrl` | `string` | `window.location.origin` | URL base para generar el QR code |
| `onDownloadStart` | `() => void` | - | Callback cuando inicia descarga |
| `onDownloadComplete` | `() => void` | - | Callback cuando termina descarga |
| `onError` | `(error: Error) => void` | - | Callback cuando hay error |

---

## 🔧 Integración con Páginas Existentes

### Opción 1: Agregar a `TicketDetailView.tsx`

Puedes agregar un botón que abra el ticket 80mm en un modal:

```tsx
// En /src/app/dashboard/tickets/[id]/TicketDetailView.tsx

import { useState } from 'react';
import TicketActions from '@/components/tickets/TicketActions';
import { Ticket80mmData } from '@/types/ticket80mm';

// ... dentro del componente

const [showTicket80mm, setShowTicket80mm] = useState(false);

// Mapear datos del ticket actual al formato Ticket80mmData
const ticket80mmData: Ticket80mmData = {
    // ... mapeo de datos
};

return (
    <div>
        {/* Botón para mostrar ticket 80mm */}
        <button onClick={() => setShowTicket80mm(true)}>
            Ver Ticket 80mm
        </button>

        {/* Modal con ticket 80mm */}
        {showTicket80mm && (
            <div className="modal">
                <TicketActions ticket={ticket80mmData} />
                <button onClick={() => setShowTicket80mm(false)}>Cerrar</button>
            </div>
        )}

        {/* ... resto del componente */}
    </div>
);
```

### Opción 2: Ruta dedicada para Ticket 80mm

Crear una ruta nueva para visualizar el ticket:

```tsx
// /src/app/dashboard/tickets/[id]/ticket80mm/page.tsx

import { notFound } from 'next/navigation';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import TicketActions from '@/components/tickets/TicketActions';
import { Ticket80mmData } from '@/types/ticket80mm';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function Ticket80mmPage({ params }: Props) {
    const { id } = await params;
    const prisma = await getTenantPrisma();

    const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: {
            customer: true,
            tenant: true,
            assignedTo: true,
            partsUsed: {
                include: { part: true },
            },
            services: true,
        },
    });

    if (!ticket) {
        notFound();
    }

    const ticketData: Ticket80mmData = {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        deviceType: ticket.deviceType,
        deviceModel: ticket.deviceModel,
        serialNumber: ticket.serialNumber,
        accessories: ticket.accessories,
        checkInNotes: ticket.checkInNotes,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        estimatedCompletionDate: ticket.estimatedCompletionDate,
        dueDate: ticket.dueDate,
        customer: ticket.customer,
        tenant: ticket.tenant,
        assignedTo: ticket.assignedTo,
        partsUsed: ticket.partsUsed,
        services: ticket.services,
    };

    return (
        <main style={{ padding: '20px', background: '#f3f4f6', minHeight: '100vh' }}>
            <TicketActions ticket={ticketData} />
        </main>
    );
}
```

---

## 📱 Funcionalidades Implementadas

### 1. **Descarga como Imagen PNG**
- Usa `html2canvas` para capturar el componente
- Resolución alta (scale: 3x)
- Nombre de archivo: `ticket-{ID}.png`

### 2. **Descarga como PDF**
- Usa `jsPDF` para generar PDF
- Formato optimizado para ticket de 80mm
- Nombre de archivo: `ticket-{ID}.pdf`

### 3. **Web Share API (Móviles)**
- Detecta automáticamente dispositivos móviles
- Permite compartir directamente por WhatsApp, Telegram, etc.
- Fallback a share de solo texto si no soporta archivos
- Solo se muestra el botón en dispositivos móviles

### 4. **Impresión Optimizada**
- Reglas `@media print` que:
  - Ocultan todo excepto el ticket
  - Ajustan el ticket a 80mm de ancho
  - Optimizan tamaños de fuente para impresión
  - Preservan colores de badges
  - Evitan saltos de página

### 5. **Código QR para Consulta de Estado**
- Genera automáticamente un código QR con la URL del ticket público
- Apunta a `/tickets/status/{ID}` para consulta sin autenticación
- Tamaño optimizado (100px en pantalla, 80px en impresión)
- Error correction level: Medium (30% recovery)
- Se puede ocultar con `showQR={false}`
- URL personalizable con prop `baseUrl`

**Ejemplo de uso:**
```tsx
<TicketActions
    ticket={ticketData}
    showQR={true}
    baseUrl="https://tudominio.com"
/>
```

El QR generado apuntará a: `https://tudominio.com/tickets/status/{ticket.id}`

---

## 🎯 Características del Diseño

### ✅ Regla de Espacio
- Padding mínimo (8px en contenedor, 2-4px en elementos)
- Márgenes compactos entre secciones (4-6px)
- Alta densidad de información sin comprometer legibilidad

### ✅ Tipografía Dual
- **Labels**: `Helvetica/Arial` normal
- **Datos dinámicos**: `JetBrains Mono/Geist Mono/Courier New` monospace
- Tamaños optimizados (7px-14px) para máxima legibilidad en espacio reducido

### ✅ Ancho Exacto
- `302px` ≈ 80mm a 96 DPI
- Diseño responsive para pantallas pequeñas
- Impresión exacta a 80mm con reglas `@media print`

### ✅ Badges de Estado
- Colores basados en tu design system existente
- Estados: `OPEN`, `IN_PROGRESS`, `WAITING_FOR_PARTS`, `RESOLVED`, `CLOSED`, `CANCELLED`
- Prioridades: `LOW`, `MEDIUM`, `HIGH`, `URGENT`

### ✅ Tablas de Alta Densidad
- Repuestos: Nombre, Cantidad, Precio, Total
- Servicios: Nombre, Costo
- Fuente monospace en valores numéricos
- Bordes minimalistas

---

## 🔍 Campos del Modelo Prisma Usados

Basado en tu `schema.prisma`, el componente usa SOLO campos existentes:

### Ticket
```prisma
id, title, description, status, priority, deviceType, deviceModel,
serialNumber, accessories, checkInNotes, createdAt, updatedAt,
estimatedCompletionDate, dueDate
```

### Customer
```prisma
id, name, email, phone, dpi, nit
```

### Tenant
```prisma
id, name
```

### User (assignedTo)
```prisma
id, name, email
```

### PartUsage + Part
```prisma
PartUsage: id, quantity
Part: id, name, sku, cost, price, category
```

### TicketService
```prisma
id, name, laborCost
```

**No se inventan campos nuevos** - Todo está basado en tu schema existente.

---

## 💡 Tips de Uso

### 1. **Imprimir desde el navegador**
```tsx
<button onClick={() => window.print()}>Imprimir</button>
```

### 2. **Solo mostrar el ticket (sin botones)**
```tsx
import Ticket80mm from '@/components/tickets/Ticket80mm';

// Usar Ticket80mm directamente sin TicketActions
<Ticket80mm ticket={ticketData} />
```

### 3. **Personalizar qué secciones mostrar**
```tsx
<TicketActions
    ticket={ticketData}
    showParts={false}           // Ocultar repuestos
    showServices={true}          // Mostrar servicios
    showCostSummary={false}      // Ocultar resumen de costos
    showQR={false}               // Ocultar código QR
/>
```

### 4. **Personalizar URL del código QR**
```tsx
// Usar URL de producción para el QR
<TicketActions
    ticket={ticketData}
    baseUrl="https://tudominio.com"
/>

// El QR apuntará a: https://tudominio.com/tickets/status/{ticket.id}
// Útil en desarrollo para que el QR apunte a producción
```

### 5. **Agregar feedback visual**
```tsx
const [downloading, setDownloading] = useState(false);

<TicketActions
    ticket={ticketData}
    onDownloadStart={() => {
        setDownloading(true);
        toast.info('Generando ticket...');
    }}
    onDownloadComplete={() => {
        setDownloading(false);
        toast.success('¡Ticket descargado!');
    }}
    onError={(error) => {
        setDownloading(false);
        toast.error(`Error: ${error.message}`);
    }}
/>
```

---

## 🧪 Testing

### Probar en diferentes dispositivos

1. **Desktop**: Verifica diseño y funciones de descarga
2. **Mobile**: Verifica Web Share API y diseño responsive
3. **Impresión**: Usa Print Preview del navegador (Ctrl+P)

### Probar con diferentes estados

```tsx
// Ticket abierto
const openTicket = { ...ticketData, status: 'OPEN' };

// Ticket resuelto con garantía
const resolvedTicket = { ...ticketData, status: 'RESOLVED' };

// Ticket con muchos repuestos
const ticketWithParts = {
    ...ticketData,
    partsUsed: [/* ... */]
};
```

---

## 🔧 Personalización Avanzada

### Cambiar colores de badges

Edita `/src/components/tickets/Ticket80mm.module.css`:

```css
.statusResolved {
    background: #YOUR_COLOR;
    color: #YOUR_TEXT_COLOR;
}
```

### Cambiar fuente monospace

```css
.dataValue {
    font-family: 'Tu Fuente Monospace', 'JetBrains Mono', monospace;
}
```

### Ajustar densidad

```css
.ticket80mm {
    padding: 12px; /* Más aire */
}

.section {
    margin: 10px 0; /* Más espacio entre secciones */
}
```

---

## 📦 Dependencias Instaladas

```json
{
    "html2canvas": "^1.4.1",
    "jspdf": "^2.5.2"
}
```

Ambas con importación dinámica para optimizar el bundle.

---

## 🚀 Próximos Pasos

1. **Integrar en TicketDetailView**: Agregar botón "Ver Ticket 80mm"
2. **Agregar a ruta pública**: `/tickets/status/[id]/ticket80mm`
3. **Configurar impresora térmica**: Ajustar settings de impresión en el navegador
4. **Agregar QR Code**: Incluir QR con link al ticket público
5. **Multi-idioma**: Agregar soporte para inglés/español

---

## 📞 Soporte

Si tienes dudas sobre la implementación:

1. Revisa las interfaces TypeScript en `/src/types/ticket80mm.ts`
2. Inspecciona el componente en `/src/components/tickets/Ticket80mm.tsx`
3. Verifica los estilos en `/src/components/tickets/Ticket80mm.module.css`

---

## ✨ Características Profesionales

- ✅ **Pixel Perfect**: Diseño exacto de 80mm (302px)
- ✅ **Type Safe**: Interfaces TypeScript basadas en Prisma
- ✅ **Optimizado**: Importaciones dinámicas para reducir bundle
- ✅ **Accesible**: forwardRef para acceso DOM desde wrapper
- ✅ **Responsive**: Funciona en desktop y móvil
- ✅ **Print Ready**: Reglas @media print optimizadas
- ✅ **Share Ready**: Web Share API integrada
- ✅ **Professional**: Diseño serio, técnico y minimalista

---

**Creado por**: Senior Fullstack Developer
**Stack**: Next.js 16 + TypeScript + Prisma + CSS Modules
**Fecha**: 2026-01-06
