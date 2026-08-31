# Sistema de Notificaciones Automáticas

El sistema envía notificaciones automáticas a los clientes cuando el estado de sus tickets cambia.

## 🎯 Características

- ✅ **Notificaciones In-App**: Campana de notificaciones en el dashboard
- 📧 **Emails Automáticos**: Templates profesionales con HTML responsivo (`@react-email`)
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

## 🛠️ Configuración (Gmail / SMTP)

El envío de correos se realiza exclusivamente con **Nodemailer** a través de **SMTP de Gmail** (app password), usando los templates de `@react-email` para el cuerpo HTML.

### Paso 1: Crear una App Password de Gmail

1. Activa la verificación en 2 pasos de tu cuenta de Google.
2. Ve a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3. Crea una nueva "Contraseña de aplicación" para la app (por ejemplo, "FIX-AI").
4. Copia la contraseña de 16 caracteres generada.

### Paso 2: Configurar Variables de Entorno

Edita tu archivo `.env.local`:

```bash
# Provider (opcional; se auto-detecta si no está definido)
EMAIL_PROVIDER=smtp

# SMTP / Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=youraccount@gmail.com
SMTP_PASS=tu-app-password-de-16-caracteres

# Email del remitente
EMAIL_FROM='FIX-AI <youraccount@gmail.com>'
```

> **Nota**: No uses tu contraseña normal de Gmail como `SMTP_PASS`. Usa una **App Password** generada con 2FA activado.

### Paso 3: Modo Log (Desarrollo)

Si no se configura ningún proveedor, `email-service.ts` usa el modo `log`: los correos no se envían pero se registran en consola, lo que permite testear flujos sin enviar emails.

## 🧪 Pruebas

### Probar Notificaciones In-App

1. Inicia sesión como cliente
2. Crea un ticket desde el wizard
3. Verifica la campana de notificaciones (arriba a la derecha)
4. Deberías ver: "Ticket #XXX creado"

### Probar Emails

**IMPORTANTE**: Para recibir emails de prueba, el cliente debe tener un email válido.

1. Crea un cliente con tu email personal
2. Crea un ticket para ese cliente
3. Revisa tu bandeja de entrada
4. Cambia el estado del ticket (por ejemplo, a `IN_PROGRESS`)
5. Deberías recibir un segundo email

### Probar Email con Script CLI

```bash
npm run send:test-email   # Envía un correo de prueba vía SMTP (Gmail)
```

## 📧 Templates de Email

Los templates viven en `src/emails/` como componentes de `@react-email`:

- `TicketCreated.tsx` - Ticket creado
- `TicketStatusChanged.tsx` - Cambio de estado
- `TechnicianAssigned.tsx` - Técnico asignado
- `SLABreach.tsx` - Incumplimiento de SLA
- `ResetPasswordEmail.tsx` - Restablecimiento de contraseña
- `PartsApprovalRequired.tsx` - Requiere aprobación de repuestos
- `LowStock.tsx` - Alerta de stock bajo
- `components/EmailLayout.tsx` - Layout base compartido

### Personalizar Templates

Edita los componentes en `src/emails/`. El envío se orquesta desde `src/lib/email-service.ts` y `src/lib/ticket-notifications.ts`:

```typescript
// src/lib/email-service.ts (enviar un email)
import { render } from '@react-email/render';
import { sendMail } from 'nodemailer';

const html = await render(<TicketCreated ticket={ticket} />);
// -> transporter.sendMail({ ... }) vía SMTP/Gmail
```

## 🔍 Monitoreo

### Ver Logs de Notificaciones

```bash
# En desarrollo
npm run dev
# Revisa la consola del servidor
```

Los logs incluyen:
- `✅ [Email Service] Email sent via Gmail/SMTP: <messageId>`
- `Failed to send notifications: [error]` (no bloquea operaciones)

## 🚨 Solución de Problemas

### No recibo emails

**1. Verifica configuración**
```bash
echo $SMTP_USER   # Tu cuenta Gmail
echo $SMTP_PASS   # Debe ser una App Password de 16 caracteres
echo $EMAIL_FROM  # Email del remitente
```

**2. Verifica logs del servidor**
```bash
npm run dev
# Busca: "Failed to send" o "Email sent via Gmail/SMTP"
```

**3. Verifica el cliente tiene email**
```typescript
// En createTicketFromTemplate o acciones de ticket
if (!customer.email) {
  console.warn('Customer has no email'); // ⚠️ No se envía email
}
```

### Emails van a spam

1. **Verifica SPF y DKIM** en tu dominio (si usas correo propio)
2. **Usa una cuenta Gmail configurada correctamente**
3. **Evita contenido spam** (muchos signos !, MAYÚSCULAS, etc.)
4. **Calienta la cuenta** (envía poco a poco, no muchos correos de golpe)

### Error: "Invalid login" / "Application-specific password required"

```bash
# SMTP_PASS debe ser una App Password de 16 caracteres, NO tu contraseña normal
# Genera una en: https://myaccount.google.com/apppasswords
```
1. Asegúrate de tener 2FA activado en la cuenta.
2. Regenera la App Password.
3. Sustituye `SMTP_PASS` en `.env.local`.
4. Reinicia el servidor: `npm run dev`.

## 🔐 Seguridad

- ✅ Emails solo a clientes del mismo tenant
- ✅ Credenciales SMTP en variables de entorno (nunca en código)
- ✅ Validación de tenant isolation en todas las notificaciones
- ✅ Errores de email no exponen información sensible

## 📝 Notas Técnicas

### Flujo de Notificaciones

```typescript
// 1. Acción de ticket (ej: resolver)
POST /api/tickets/:id/actions { action: 'resolve', note: '...' }

// 2. Actualización exitosa en DB
await db.ticket.update({ status: 'RESOLVED' })

// 3. Envío de notificaciones (no bloqueante)
try {
  await notifyTicketStatusChange(ticket, { oldStatus, newStatus })
  // → In-app notification (createNotification)
  // → Email notification (sendTicketStatusChangedEmail)
} catch (err) {
  console.error(err) // Log pero no falla la request
}

// 4. Response al cliente
return { success: true, ticket }
```

### Arquitectura

```
src/lib/
├── email-service.ts          # Lógica de envío (Nodemailer / SMTP / Gmail)
├── ticket-notifications.ts   # Lógica de notificaciones (in-app + email)
├── sla-actions.ts            # Alertas de SLA (email + in-app)
└── notifications.ts          # Notificaciones in-app

src/emails/
├── TicketCreated.tsx         # Templates @react-email
├── TicketStatusChanged.tsx
└── ...

src/app/api/tickets/[id]/actions/
└── route.ts                  # Integration point
```

## 🚀 Siguientes Pasos

- [ ] Implementar preferencias de notificación por usuario
- [ ] Agregar templates multiidioma
- [ ] Implementar rate limiting para prevenir spam

---

**¿Necesitas ayuda?** Revisa los logs del servidor o la configuración de Nodemailer/Gmail.
