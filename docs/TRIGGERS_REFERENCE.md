# Referencia Tecnica: Triggers y Constraints de Base de Datos

Este documento describe los triggers y constraints implementados en PostgreSQL para garantizar la integridad de datos en FIX-AI-NEXT.

## 1. Triggers de Inventario
- prevent_negative_stock: Valida que Part.quantity >= 0 y Part.minStock >= 0.

## 2. Triggers de Secuenciacion
- auto_generate_ticket_number: Secuencia incremental de ticket por tenantId.
- auto_generate_invoice_number: Secuencia fiscal anual de facturacion (YYYY-XXXX).

## 3. Integridad Temporal
- validate_ticket_dates: Asegura coherencia cronologica (dueDate, resolvedAt, closedAt >= createdAt).

## 4. Timestamps Automaticos
- update_updated_at_column: Actualizacion automatica de updatedAt en updates.
