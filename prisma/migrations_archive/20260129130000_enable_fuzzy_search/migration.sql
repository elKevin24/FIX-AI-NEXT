-- Habilitar la extensión pg_trgm (Trigramas)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índices GIN para Búsqueda Difusa en Clientes
-- Permite buscar por Nombre, Email, Teléfono, NIT
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_email_trgm ON customers USING GIN (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_phone_trgm ON customers USING GIN (phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_nit_trgm ON customers USING GIN (nit gin_trgm_ops);

-- Índices GIN para Tickets
-- Permite buscar por Título, Descripción, Número, Serial
CREATE INDEX IF NOT EXISTS idx_tickets_title_trgm ON tickets USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tickets_desc_trgm ON tickets USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tickets_number_trgm ON tickets USING GIN ("ticketNumber" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tickets_serial_trgm ON tickets USING GIN ("serialNumber" gin_trgm_ops);

-- Índices GIN para Partes (Inventario)
-- Permite buscar por Nombre, SKU
CREATE INDEX IF NOT EXISTS idx_parts_name_trgm ON parts USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_parts_sku_trgm ON parts USING GIN (sku gin_trgm_ops);
