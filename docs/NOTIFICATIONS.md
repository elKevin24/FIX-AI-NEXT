# Sistema de Notificaciones Automáticas

El sistema envía notificaciones automáticas a los clientes cuando el estado de sus tickets cambia.

## 🎯 Características

- ✅ **Notificaciones In-App**: Campana de notificaciones en el dashboard
- 📧 **Emails Automáticos**: Templates profesionales con HTML responsivo
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

## 🛠️ Configuración

### Paso 1: Crear cuenta en Resend

1. Visita [resend.com](https://resend.com)
2. Crea una cuenta gratuita (100 emails/día)
3. Verifica tu dominio o usa el dominio de prueba

### Paso 2: Obtener API Key

1. Ve a [resend.com/api-keys](https://resend.com/api-keys)
2. Crea una nueva API key
3. Copia la key (empieza con `re_`)

### Paso 3: Configurar Variables de Entorno

Edita tu archivo `.env.local`:

```bash
# Resend Email Service
RESEND_API_KEY=re_abc123xyz_YOUR_ACTUAL_KEY_HERE
RESEND_FROM_EMAIL=noreply@yourdomain.com

# (Opcional) Personalizar URL del dashboard
AUTH_URL=https://yourdomain.com
```

### Paso 4: Verificar Email del Remitente

**Opción A: Usar dominio de prueba de Resend**
```bash
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Opción B: Usar tu propio dominio** (recomendado para producción)
1. Agrega tu dominio en Resend
2. Configura los registros DNS (SPF, DKIM)
3. Espera verificación (~24h)
4. Usa tu email: `RESEND_FROM_EMAIL=noreply@tudominio.com`

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

### Probar Email con Template

```bash
# Opción 1: Crear ticket con el wizard
npm run dev
# Navega a: http://localhost:3000/dashboard/tickets/create-with-template
# Selecciona "Mantenimiento Preventivo"
# Usa un cliente con email válido

# Opción 2: Usar el script de templates
npm run create:maintenance-templates
```

## 📧 Templates de Email

Los templates están en `src/lib/email-service.ts`:

- `getTicketCreatedTemplate()` - Ticket creado
- `getStatusChangeTemplate()` - Cambio de estado genérico
- `getTicketResolvedTemplate()` - Ticket resuelto (especial)
- `getTicketClosedTemplate()` - Ticket cerrado (especial)

### Personalizar Templates

Edita `src/lib/email-service.ts` y modifica las funciones de template.

Los emails usan:
- HTML inline para máxima compatibilidad
- Diseño responsivo
- Gradientes según el estado
- Iconos emoji para mejor UX
- Botón CTA para ver detalles

## 🔍 Monitoreo

### Ver Logs de Notificaciones

```bash
# En desarrollo
npm run dev
# Revisa la consola del servidor
```

Los logs incluyen:
- `✓ Email sent to user@example.com for ticket creation`
- `✓ Email sent to user@example.com for status: RESOLVED`
- `Failed to send notifications: [error]` (no bloquea operaciones)

### Dashboard de Resend

1. Ve a [resend.com/emails](https://resend.com/emails)
2. Revisa los emails enviados
3. Ve el estado de entrega
4. Revisa bounces y quejas

## 🚨 Solución de Problemas

### No recibo emails

**1. Verifica configuración**
```bash
echo $RESEND_API_KEY  # Debe empezar con "re_"
echo $RESEND_FROM_EMAIL  # Email verificado
```

**2. Verifica logs del servidor**
```bash
npm run dev
# Busca: "Failed to send" o "Email sent"
```

**3. Verifica el cliente tiene email**
```typescript
// En createTicketFromTemplate o acciones de ticket
if (!customer.email) {
  console.warn('Customer has no email'); // ⚠️ No se envía email
}
```

**4. Revisa Resend Dashboard**
- ¿El email aparece como enviado?
- ¿Hay errores de autenticación?
- ¿El dominio está verificado?

### Emails van a spam

1. **Verifica SPF y DKIM** en tu dominio
2. **Usa un dominio verificado** (no el de prueba)
3. **Evita contenido spam** (muchos signos !, MAYÚSCULAS, etc.)
4. **Calienta el dominio** (envía poco a poco, no 1000 emails de golpe)

### Error: "Invalid API Key"

```bash
# La API key debe empezar con "re_"
# Ejemplo correcto: re_abc123xyz
# Ejemplo incorrecto: abc123xyz
```

1. Ve a [resend.com/api-keys](https://resend.com/api-keys)
2. Revisa que la key esté activa
3. Copia y pega de nuevo en `.env.local`
4. Reinicia el servidor: `npm run dev`

### Error: "From email not verified"

```bash
# Usa el dominio de prueba
RESEND_FROM_EMAIL=onboarding@resend.dev

# O verifica tu dominio en Resend
```

## 📊 Límites

### Plan Gratuito de Resend
- 100 emails/día
- 1 dominio verificado
- 1 equipo
- API access completo

### Plan Pro
- 50,000 emails/mes ($20/mes)
- Dominios ilimitados
- Sin branding de Resend
- Soporte prioritario

## 🔐 Seguridad

- ✅ Emails solo a clientes del mismo tenant
- ✅ API keys en variables de entorno (nunca en código)
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
  // → Email notification (sendTicketResolvedEmail)
} catch (err) {
  console.error(err) // Log pero no falla la request
}

// 4. Response al cliente
return { success: true, ticket }
```

### Arquitectura

```
src/lib/
├── email-service.ts          # Templates HTML + Resend API
├── ticket-notifications.ts   # Lógica de notificaciones
└── notifications.ts          # Notificaciones in-app

src/app/api/tickets/[id]/actions/
└── route.ts                  # Integration point
```

## 🎨 Personalización Avanzada

### Agregar Nuevo Tipo de Notificación

1. **Crea template HTML**:
```typescript
// src/lib/email-service.ts
export async function sendCustomEmail(data: CustomData) {
  await resend.emails.send({
    from: DEFAULT_FROM_EMAIL,
    to: data.email,
    subject: 'Mi Subject Personalizado',
    html: getCustomTemplate(data),
  });
}
```

2. **Llama desde tu acción**:
```typescript
// src/app/api/my-action/route.ts
import { sendCustomEmail } from '@/lib/email-service';

await sendCustomEmail({ ... });
```

### Agregar Attachments

```typescript
await resend.emails.send({
  from: DEFAULT_FROM_EMAIL,
  to: customer.email,
  subject: 'Ticket Resolved',
  html: template,
  attachments: [
    {
      filename: 'invoice.pdf',
      content: pdfBuffer,
    }
  ],
});
```

## 🚀 Siguientes Pasos

- [ ] Configurar webhooks de Resend para tracking de entregas
- [ ] Agregar notificaciones por WhatsApp (Twilio)
- [ ] Implementar preferencias de notificación por usuario
- [ ] Agregar templates multiidioma
- [ ] Implementar rate limiting para prevenir spam

---

**¿Necesitas ayuda?** Revisa la [documentación de Resend](https://resend.com/docs) o los logs del servidor.
