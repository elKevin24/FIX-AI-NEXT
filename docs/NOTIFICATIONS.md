# Sistema de Notificaciones Automáticas

El sistema envía notificaciones automáticas a los clientes y técnicos cuando el estado de sus tickets cambia.

## 🎯 Características

- ✅ **Notificaciones In-App**: Campana de notificaciones en el dashboard
- 📧 **Emails Automáticos**: Templates profesionales con HTML responsivo vía React Email y Nodemailer
- 🎨 **Templates por Estado**: Diseños específicos para cada transición
- 🔔 **Notificación a Técnicos**: Los técnicos reciben notificaciones cuando se les asigna un ticket
- 🚀 **No-bloqueante**: Los errores de notificación no afectan las operaciones de ticket

## 📬 Tipos de Notificaciones

### 1. Creación de Ticket
- **Cuándo**: Al crear un ticket nuevo (manual o desde template)
- **Destinatario**: Cliente
- **Contenido**: Confirmación de recepción, número de ticket, estado inicial

### 2. Cambios de Estado
- **Cuándo**: Cualquier cambio en el estado del ticket
- **Destinatario**: Cliente
- **Estados**:
  - `OPEN` → Ticket abierto, esperando asignación
  - `IN_PROGRESS` → Técnico trabajando activamente
  - `WAITING_FOR_PARTS` → Esperando llegada de partes
  - `RESOLVED` → ¡Equipo listo para recoger!
  - `CLOSED` → Ticket completado
  - `CANCELLED` → Ticket cancelado

### 3. Asignación de Técnico
- **Cuándo**: Se asigna un técnico al ticket (acción `assign` o `take`)
- **Destinatario**: Técnico asignado
- **Contenido**: Información del ticket y cliente

## 🛠️ Configuración del Servicio de Correo (SMTP / Nodemailer)

El servicio de emails (`src/lib/email-service.ts`) soporta dos modos:
1. **SMTP (`EMAIL_PROVIDER=smtp`)**: Envío real vía cualquier servidor SMTP estándar (Gmail, Amazon SES, SendGrid, Mailgun, SMTP propio).
2. **Log (`EMAIL_PROVIDER=log`)**: Modo por defecto cuando no hay servidor SMTP configurado; simula el envío y registra los emails en la consola para desarrollo y pruebas seguras.

### Variables de Entorno

Edita tu archivo `.env`:

```bash
# Proveedor de correo (opciones: 'smtp' | 'log')
EMAIL_PROVIDER=smtp

# Remitente de los correos
EMAIL_FROM=FIX-AI <noreply@tudominio.com>

# Configuración del servidor SMTP
SMTP_HOST=smtp.tudominio.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-usuario-smtp
SMTP_PASS=tu-password-smtp
```

### Configuración con Gmail (Ejemplo)

1. Ve a tu cuenta de Google > Seguridad > Verificación en dos pasos.
2. Genera una **Contraseña de Aplicación** (App Password).
3. Configura tus variables:
```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu_correo@gmail.com
SMTP_PASS=tu_app_password_de_16_caracteres
EMAIL_FROM=Mi Taller <tu_correo@gmail.com>
```

## 🧪 Pruebas

### Probar Envío desde CLI

Puedes ejecutar el script de prueba de envío:
```bash
npx tsx scripts/send-test-email.ts
```

### Probar Notificaciones In-App

1. Inicia sesión en el sistema.
2. Crea o actualiza un ticket desde el dashboard.
3. Verifica la campana de notificaciones (arriba a la derecha).

### Probar Emails con Tickets

1. Crea un cliente con un email válido.
2. Crea un ticket asignado a ese cliente.
3. Si SMTP está configurado, revisa la bandeja de entrada del cliente. Si estás en modo `log`, revisa los registros en la terminal del servidor.

## 📧 Templates de Email

Los templates están desarrollados con `@react-email` y Nodemailer en `src/lib/email-service.ts` y componentes de plantilla:

- Confirmación de creación de ticket
- Notificación de cambio de estado
- Aviso de resolución y retiro de equipo
- Notificación de cierre de ticket

## 🔍 Monitoreo y Logs

```bash
# En desarrollo
npm run dev
# Revisa la consola del servidor
```

Los logs incluyen:
- `✅ [Email Service] Email sent via SMTP: <message-id>`
- `⚠️ [Email Service] No SMTP provider configured. Email not sent, but logged to console.`
- `❌ [Email Service] SMTP Error: <error>` (no bloquea la operación del ticket)

## 🔐 Seguridad

- ✅ Emails solo a clientes del mismo tenant
- ✅ Credenciales SMTP en variables de entorno (nunca en código)
- ✅ Validación de tenant isolation en todas las notificaciones
- ✅ Fallos en el envío de correos no abortan transacciones críticas de base de datos
