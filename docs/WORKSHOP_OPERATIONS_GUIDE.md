# Manual Operativo del Taller (Workshop Operations Guide)

**FIX-AI NEXT — Multi-Tenant Workshop Management System**

Este documento detalla el flujo operativo estándar de extremo a extremo para la recepción, diagnóstico, notificación por WhatsApp, impresión y entrega de equipos en el taller.

---

## 1. Recepción de Equipos y Checklist Físico

Al recibir un equipo en el mostrador (`/dashboard/tickets/create`), el recepcionista o técnico debe registrar las condiciones físicas iniciales del dispositivo para garantizar la transparencia y proteger la responsabilidad del taller.

### 1.1 Checklist de Inspección Inicial
El sistema incluye píldoras interactivas de verificación rápida:

| Elemento de Inspección | Estado Esperado / Opciones | Notas de Seguridad |
| :--- | :--- | :--- |
| **Enciende / POST** | Sí / No / Intermitente | Probar con cargador de prueba del taller si no trae el propio. |
| **Pantalla / Display** | Intacta / Rayada / Rota / Manchas | Verificar táctil y retroiluminación. |
| **Chasis / Carcasa** | Bueno / Golpes / Quebrado | Documentar abolladuras en esquinas o bisagras rotas. |
| **Tornillería** | Completa / Faltante / Barrida | Indicar si el equipo ya fue abierto previamente por terceros. |
| **Batería** | Normal / Inflada / No retiene carga | En caso de batería inflada, manipular bajo protocolo de seguridad. |
| **Humedad / Líquidos** | Sin indicios / Sulfatado / Mojado | Revisar testigos de humedad (LDI) en bandeja SIM o placa. |
| **Cargador / Accesorios** | Incluido (Marca/Modelo) / No incluye | Etiquetar cargadores con el número de ticket. |
| **Patrón / PIN de Bloqueo** | Registrado / Sin PIN / No proporcionado | Requerido para pruebas funcionales post-reparación. |

---

## 2. Estados de Tickets y Notificaciones 1-Click por WhatsApp

El módulo `src/lib/whatsapp-utils.ts` estandariza los mensajes profesionales que se envían directamente al cliente vía WhatsApp Web o App con un solo clic desde la vista de detalle del ticket (`/dashboard/tickets/[id]`).

### 2.1 Matriz de Estados y Mensajes

```
[RECEPCIÓN] -> [DIAGNÓSTICO] -> [ESPERA DE APROBACIÓN] -> [EN REPARACIÓN] -> [LISTO PARA ENTREGA] -> [ENTREGADO]
                                          |
                                    [CANCELADO]
```

1. **Recepción (Ticket Creado):**
   - *Mensaje:* Saludo personalizado, confirmación de ingreso del equipo (Marca/Modelo), número de ticket (`#TICK-XXXX`), resumen de la falla reportada y enlace seguro al portal público de seguimiento en tiempo real (`/tickets/status/[id]`).
2. **Diagnóstico y Cotización (Esperando Aprobación):**
   - *Mensaje:* Notificación con el diagnóstico técnico, presupuesto detallado de repuestos y mano de obra, y botón/enlace para que el cliente apruebe o rechace partes directamente desde su navegador.
3. **En Reparación (In Progress):**
   - *Mensaje:* Confirmación de inicio de trabajos tras la aprobación.
4. **Listo para Entrega (Ready for Pickup):**
   - *Mensaje:* Aviso de finalización de pruebas, monto total a liquidar en caja, horarios de atención del taller y dirección física.
5. **Entregado y Cerrado (Delivered):**
   - *Mensaje:* Agradecimiento, resumen de garantía otorgada (días hábiles) y contacto de soporte.

---

## 3. Formatos de Impresión de Comprobantes

El sistema provee dos formatos optimizados de comprobantes físicos adaptados a las impresoras de taller:

### 3.1 Formato Térmico 80mm (`/dashboard/tickets/[id]/ticket80mm`)
- Diseñado para impresoras térmicas POS (Epson TM-T20, Star Micronics, Xprinter, etc.).
- Ancho estándar: 72mm imprimibles (80mm papel).
- Incluye:
  - Logotipo e información fiscal del taller (`TenantSettings`).
  - Código QR con URL directa al portal de seguimiento del cliente.
  - Checklist físico resumido.
  - Cláusula de almacenamiento y términos de servicio legales.
  - Firma física de conformidad del cliente y del recepcionista.

### 3.2 Formato Media Carta (`/dashboard/tickets/[id]/print-half-letter`)
- Diseñado para impresoras láser o de inyección en hojas de 140 × 216 mm (Statement / Half Letter).
- Formato administrativo de 2 columnas con desglose completo de partes, costos unitarios, mano de obra, cotizaciones vinculadas y póliza de garantía legal de 90 días.

---

## 4. Procedimiento de Cobro en Caja y Cierre de Orden (POS)

El flujo de liquidación garantiza la integridad atómica entre el estado del ticket, el inventario de repuestos y el arqueo de caja (`/dashboard/cash-register` y `/dashboard/pos`):

1. **Verificación de Caja Abierta:**
   - Todo cobro requiere que el usuario tenga una sesión de caja activa (`CashRegisterSession`) con su monto inicial registrado.
2. **Liquidación del Ticket:**
   - En la vista de detalle del ticket o en el módulo POS, seleccionar **Liquidar / Facturar**.
   - Se cargan automáticamente los repuestos consumidos (`TicketPart`) y los servicios prestados (`TicketService`).
3. **Métodos de Pago:**
   - Soporte para Efectivo (`CASH`), Tarjeta de Débito/Crédito (`CARD`), Transferencia SPEI (`TRANSFER`) y Crédito de Taller (`CREDIT`).
4. **Consumo Atómico y Factura:**
   - Al confirmar el pago:
     - Se descuentan definitivamente las unidades del inventario (`Part.stock`).
     - Se registra la transacción en el flujo de caja (`CashTransaction`).
     - Se genera la factura o comprobante de venta (`Invoice`).
     - El ticket pasa a estado `DELIVERED` o `CLOSED`.
5. **Arqueo y Corte de Caja (`GenerateCashCutUseCase`):**
   - Al final de la jornada, el administrador o cajero genera el corte X/Z comparando el efectivo en caja contra el monto calculado por el sistema, registrando discrepancias y cerrando la sesión.
