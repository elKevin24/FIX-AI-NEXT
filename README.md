# Multi-Tenant Workshop Management System

Una aplicación escalable de gestión de talleres electrónicos construida con **Next.js 16**, **React 19**, **PostgreSQL**, **Prisma**, y **NextAuth.js v5**. Diseñada para manejar múltiples talleres (tenants) bajo un solo sistema con aislamiento completo de datos.

## 🚀 Características Principales

### Multi-Tenancy
- **Aislamiento de datos por tenant**: Cada taller tiene su propio conjunto de usuarios, tickets, clientes y repuestos
- **Validación automática**: Todas las consultas y mutaciones validan el `tenantId` del usuario autenticado
- **Escalabilidad horizontal**: Arquitectura preparada para crecer con nuevos talleres
- **Proxy middleware**: Protección de rutas con aislamiento de tenant

### Gestión de Tickets
- Sistema completo CRUD de tickets
- Estados: `OPEN`, `IN_PROGRESS`, `WAITING_FOR_PARTS`, `RESOLVED`, `CLOSED`
- Prioridades: `Low`, `Medium`, `High`
- Asignación de técnicos
- Seguimiento de repuestos utilizados
- Consulta pública de estado sin autenticación

### Autenticación y Autorización
- **NextAuth.js v5** (beta) con provider de credenciales
- Roles: `ADMIN`, `TECHNICIAN`, `RECEPTIONIST`
- Control de acceso basado en roles (RBAC)
- Sesiones con JWT incluyendo `tenantId` y `role`
- Middleware para protección de rutas

### Auditoría y Trazabilidad
- Registro automático de todas las acciones críticas
- Tabla `AuditLog` con detalles de cambios
- Tracking de CREATE, UPDATE, DELETE en tickets
- Información de usuario y timestamp para compliance

## 🛠️ Stack Tecnológico

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Next.js** | 16.0.7 | Framework React con App Router y Turbopack |
| **React** | 19.2.1 | UI Library |
| **TypeScript** | 5.x | Tipado estático |
| **PostgreSQL** | 14+ | Base de datos relacional |
| **Prisma** | 5.22.0 | ORM y migraciones |
| **NextAuth.js** | 5.0.0-beta.30 | Autenticación |
| **bcryptjs** | 2.4.3 | Hash de contraseñas |
| **Zod** | 3.23.8 | Validación de schemas |
| **CSS Modules** | - | Estilos con scope local |

## 🎨 Estilos y CSS

**IMPORTANTE:** Este proyecto **NO utiliza Tailwind CSS**. Todos los estilos están implementados con:

- **CSS Modules** - Para componentes con estilos con scope local (`.module.css`)
- **CSS Global** - Variables CSS y clases globales en `src/app/globals.css`
- **Custom CSS Properties** - Variables CSS para theming consistente

### Estructura de Estilos

```
src/
├── app/
│   ├── globals.css              # Estilos globales y CSS variables
│   └── dashboard/
│       └── tickets/
│           └── create/
│               └── SimpleTicketForm.module.css  # CSS Module
└── components/
    └── ui/
        └── *.module.css         # CSS Modules por componente
```

### Ejemplo de Uso

```tsx
// ❌ NO USAR: Tailwind classes
<div className="max-w-7xl mx-auto p-4">

// ✅ USAR: CSS Modules
import styles from './Component.module.css';
<div className={styles.container}>
```

### CSS Variables Disponibles

El proyecto usa CSS custom properties definidas en `globals.css`:
- `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`
- `--color-border-light`, `--color-border-medium`
- `--color-success-bg`, `--color-success-border`, `--color-success-text`
- `--color-error`, `--color-error-bg`

## 📋 Requisitos Previos

- **Node.js** 18+
- **PostgreSQL** 14+
- **npm** o **yarn**
- **Docker** (opcional, para PostgreSQL local)

## 🛠️ Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/your-username/FIX-AI-NEXT.git
cd FIX-AI-NEXT
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar PostgreSQL

#### Opción A: Usando Docker (Recomendado)

```bash
docker-compose up -d
```

Esto levantará PostgreSQL en `localhost:5432`.

#### Opción B: PostgreSQL local

Asegúrate de tener PostgreSQL corriendo y crea una base de datos:

```sql
CREATE DATABASE workshop_db;
CREATE USER workshop_user WITH PASSWORD 'workshop_pass';
GRANT ALL PRIVILEGES ON DATABASE workshop_db TO workshop_user;
```

### 4. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Database
DATABASE_URL="postgresql://workshop_user:workshop_pass@localhost:5432/workshop_db?schema=public"

# NextAuth
AUTH_SECRET="your-secret-key-here"  # Genera con: openssl rand -base64 32
```

### 5. Configurar la base de datos

```bash
# Generar cliente de Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev --name init

# Poblar con datos iniciales (opcional)
npx prisma db seed
```

Esto creará:
- **Tenant por defecto**: "Default Workshop" (slug: `default-workshop`)
- **Usuario admin**: `admin@example.com` / `password123`
- **Usuario técnico**: `tech@example.com` / `password123`

## 🚀 Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Credenciales de prueba

| Email | Password | Rol |
|-------|----------|-----|
| `admin@example.com` | `password123` | ADMIN |
| `tech@example.com` | `password123` | TECHNICIAN |

## 📁 Estructura del Proyecto

```
FIX-AI-NEXT/
├── prisma/
│   ├── schema.prisma          # Esquema de base de datos
│   ├── seed.ts                # Datos iniciales
│   └── migrations/            # Historial de migraciones
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/  # Rutas de NextAuth
│   │   │   └── tickets/             # API REST de tickets
│   │   ├── dashboard/               # Panel autenticado
│   │   │   ├── page.tsx             # Dashboard principal
│   │   │   ├── tickets/             # Gestión de tickets
│   │   │   ├── users/               # Gestión de usuarios (ADMIN)
│   │   │   ├── customers/           # Gestión de clientes
│   │   │   └── settings/            # Configuración
│   │   ├── login/                   # Página de login
│   │   ├── tickets/status/          # Consulta pública
│   │   ├── layout.tsx               # Layout raíz
│   │   ├── page.tsx                 # Landing page
│   │   └── globals.css              # Estilos globales
│   ├── lib/
│   │   ├── prisma.ts                # Cliente singleton de Prisma
│   │   └── actions.ts               # Server Actions
│   ├── types/
│   │   └── next-auth.d.ts           # Extensión de tipos NextAuth
│   ├── auth.ts                      # Configuración de NextAuth
│   ├── auth.config.ts               # Config compartida
│   └── proxy.ts                     # Proxy middleware (Next.js 16)
├── docker-compose.yml               # PostgreSQL container
├── eslint.config.mjs                # ESLint 9 flat config
├── next.config.js                   # Configuración de Next.js
├── package.json
└── tsconfig.json
```

## 🔐 Seguridad y Multi-Tenancy

### Aislamiento de Datos

Todas las consultas incluyen validación automática de `tenantId`:

```typescript
// ✅ CORRECTO: Con tenant isolation
const tickets = await prisma.ticket.findMany({
  where: {
    tenantId: session.user.tenantId, // Aislamiento automático
  },
});

// ❌ INCORRECTO: Sin validación (expone datos de otros tenants)
const tickets = await prisma.ticket.findMany();
```

### Control de Acceso Basado en Roles (RBAC)

```typescript
// Solo ADMIN puede eliminar tickets
if (session.user.role !== 'ADMIN') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Técnicos y admins pueden actualizar tickets
if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### Auditoría de Acciones

```typescript
// Log automático de acciones críticas
await prisma.auditLog.create({
  data: {
    action: 'UPDATE_TICKET',
    details: JSON.stringify({ ticketId, changes }),
    userId: session.user.id,
    tenantId: session.user.tenantId,
  },
});
```

### Proxy Middleware (Next.js 16)

```typescript
// src/proxy.ts - Protege rutas automáticamente
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
```

## 🎯 Casos de Uso

### 1. Recepcionista crea un ticket

1. Login con credenciales de recepcionista
2. Navegar a "Tickets" → "New Ticket"
3. Seleccionar cliente y completar formulario
4. El ticket se crea automáticamente con `tenantId` del usuario
5. Se registra en `AuditLog`

### 2. Técnico actualiza estado

1. Ver lista de tickets asignados
2. Abrir ticket específico
3. Cambiar estado a `IN_PROGRESS`
4. Agregar notas o repuestos utilizados
5. Marcar como `RESOLVED` cuando esté completo

### 3. Cliente consulta estado (público)

1. Ir a `/tickets/status` (sin autenticación)
2. Ingresar ID del ticket
3. Ver estado, descripción y tenant asociado

### 4. Admin gestiona usuarios

1. Login como ADMIN
2. Navegar a "Users"
3. Ver lista de usuarios del tenant
4. Crear, editar o eliminar usuarios (futuro)

## 📊 Modelo de Datos

### Diagrama de Entidades

```
┌─────────────┐
│   Tenant    │──┐
└─────────────┘  │
                 │ 1:N
                 ├──────────┬──────────┬──────────┬──────────┐
                 │          │          │          │          │
            ┌────▼───┐ ┌───▼────┐ ┌──▼─────┐ ┌──▼─────┐ ┌──▼──────┐
            │  User  │ │ Ticket │ │Customer│ │  Part  │ │AuditLog │
            └────┬───┘ └───┬────┘ └───┬────┘ └────┬───┘ └─────────┘
                 │         │          │           │
                 │ 1:N     │ N:1      │ 1:N       │
                 └────────►│◄─────────┘           │
                           │                      │
                           │ N:M                  │
                           ├──────────────────────┤
                           │                      │
                      ┌────▼─────┐                │
                      │PartUsage │◄───────────────┘
                      └──────────┘
```

### Entidades Principales

- **Tenant**: Representa un taller/empresa
- **User**: Usuarios del sistema (vinculados a un tenant)
- **Customer**: Clientes del taller
- **Ticket**: Tickets de servicio/reparación
- **Part**: Repuestos/partes del inventario
- **PartUsage**: Relación N:M entre tickets y partes
- **AuditLog**: Registro de auditoría de acciones

## 🚢 Despliegue

### Vercel (Recomendado)

1. **Push a GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Conectar en Vercel**
   - Ve a [vercel.com](https://vercel.com)
   - Importa el repositorio
   - Vercel detectará automáticamente Next.js

3. **Configurar variables de entorno**
   ```env
   DATABASE_URL="postgresql://user:pass@host:5432/db"
   AUTH_SECRET="your-production-secret"
   ```

4. **Deploy automático**
   - Cada push a `main` desplegará automáticamente

### Railway / Render

Similar a Vercel, solo necesitas:
1. Conectar repositorio
2. Configurar variables de entorno
3. Railway/Render detectará Next.js automáticamente

### Docker (Auto-hospedado)

```bash
# Build
docker build -t workshop-app .

# Run
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e AUTH_SECRET="..." \
  workshop-app
```

## 🧪 Testing (Próximamente)

```bash
# Unit tests con Jest
npm run test

# E2E tests con Playwright
npm run test:e2e

# Linting
npm run lint
```

## 📝 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo con Turbopack |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint con ESLint 9 |
| `npx prisma studio` | GUI visual de base de datos |
| `npx prisma migrate dev` | Crear nueva migración |
| `npx prisma db seed` | Poblar base de datos |
| `npx prisma generate` | Regenerar Prisma Client |

## 🔄 Migraciones de Next.js 15 a 16

Este proyecto usa Next.js 16 con las siguientes actualizaciones:

### Breaking Changes Implementados

1. **Middleware → Proxy**
   - Renombrado de `middleware.ts` a `proxy.ts`
   - Next.js 16 depreca middleware en favor de proxy

2. **Parámetros Async en Route Handlers**
   ```typescript
   // ❌ Next.js 15
   export async function GET(req, { params }: { params: { id: string } }) {
     const id = params.id;
   }

   // ✅ Next.js 16
   export async function GET(req, { params }: { params: Promise<{ id: string }> }) {
     const { id } = await params;
   }
   ```

3. **ESLint 9 Flat Config**
   - Migrado de `.eslintrc.json` a `eslint.config.mjs`
   - Uso de `@eslint/eslintrc` para compatibilidad

## 🐛 Troubleshooting

### Error: `MissingSecret`

```bash
# Genera un secret
openssl rand -base64 32

# Agrégalo a .env
AUTH_SECRET="el-secret-generado"
```

### Error: `Cannot connect to database`

```bash
# Verifica que PostgreSQL esté corriendo
docker ps

# O reinicia el contenedor
docker-compose restart
```

### Error: `Prisma Client not generated`

```bash
npx prisma generate
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add: AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

## 🗺️ Roadmap

### Próximas Características

- [ ] **Internationalization (i18n)** - Soporte multi-idioma
- [ ] **Notificaciones** - Email/SMS para updates de tickets
- [ ] **Testing completo** - Jest + Playwright
- [ ] **Dashboard analytics** - Gráficos y métricas
- [ ] **Gestión de inventario** - Stock de partes
- [ ] **API pública** - REST API para integraciones
- [ ] **Webhooks** - Eventos para sistemas externos
- [ ] **Facturación** - Integración con sistemas de pago
- [ ] **Reports** - Exportación PDF/Excel

## 🙏 Agradecimientos

- [Next.js Team](https://nextjs.org/) - Framework increíble
- [Prisma Team](https://www.prisma.io/) - ORM poderoso
- [NextAuth.js Team](https://authjs.dev/) - Auth simplificado
- [Vercel](https://vercel.com/) - Hosting y deployment

---

**Desarrollado con ❤️ para la gestión eficiente de talleres electrónicos**

**Stack:** Next.js 16 • React 19 • TypeScript • PostgreSQL • Prisma • NextAuth v5
