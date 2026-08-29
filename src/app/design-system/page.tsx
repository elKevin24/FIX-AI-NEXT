'use client';

import { useState, Suspense } from 'react';
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardBody, 
  Badge, 
  Input, 
  Textarea, 
  Select, 
  Alert,
  Modal,
  DataTable,
  PaginationControls,
  SearchInputGroup,
  BrandLogo,
  ExportButton,
  ThemeSwitcher
} from '@/components/ui';
import type { SelectOption } from '@/components/ui';
import PageHeader from '@/components/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { TicketStatusBadge } from '@/components/tickets/TicketStatusBadge';
import { ColumnDef } from '@tanstack/react-table';

interface SampleTicket {
  id: string;
  ticketNumber: string;
  title: string;
  customer: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_PARTS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  total: number;
}

export default function DesignSystemPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: '2rem' }}>Cargando Design System...</div>}>
      <DesignSystemContent />
    </Suspense>
  );
}

function DesignSystemContent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const statusOptions: SelectOption[] = [
    { value: 'open', label: 'Abierto' },
    { value: 'in_progress', label: 'En Progreso' },
    { value: 'waiting_for_parts', label: 'Esperando Repuestos' },
    { value: 'resolved', label: 'Resuelto' },
  ];

  const sampleData: SampleTicket[] = [
    { id: '1', ticketNumber: 'TK-1001', title: 'Cambio de pantalla OLED', customer: 'Carlos Mendoza', status: 'IN_PROGRESS', priority: 'HIGH', total: 450 },
    { id: '2', ticketNumber: 'TK-1002', title: 'Mantenimiento preventivo laptop', customer: 'Sofía Morales', status: 'OPEN', priority: 'MEDIUM', total: 180 },
    { id: '3', ticketNumber: 'TK-1003', title: 'Reemplazo de batería y puerto de carga', customer: 'Alejandro Ruiz', status: 'WAITING_FOR_PARTS', priority: 'CRITICAL', total: 320 },
    { id: '4', ticketNumber: 'TK-1004', title: 'Diagnóstico placa base no enciende', customer: 'María Torres', status: 'RESOLVED', priority: 'LOW', total: 95 },
  ];

  const sampleColumns: ColumnDef<SampleTicket>[] = [
    { accessorKey: 'ticketNumber', header: 'Código' },
    { accessorKey: 'title', header: 'Título / Tarea' },
    { accessorKey: 'customer', header: 'Cliente' },
    { 
      accessorKey: 'status', 
      header: 'Estado',
      cell: ({ row }) => <TicketStatusBadge status={row.original.status} />
    },
    { 
      accessorKey: 'priority', 
      header: 'Prioridad',
      cell: ({ row }) => {
        const p = row.original.priority;
        const variant = p === 'CRITICAL' || p === 'HIGH' ? 'error' : p === 'MEDIUM' ? 'warning' : 'info';
        return <Badge variant={variant}>{p}</Badge>;
      }
    },
    { 
      accessorKey: 'total', 
      header: 'Total',
      cell: ({ row }) => <strong>Q{row.original.total.toFixed(2)}</strong>
    },
  ];

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-8)', paddingBottom: 'var(--spacing-12)', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <PageHeader
        title="🎨 Sistema de Diseño (Design System)"
        subtitle="Tokens, componentes estándar y patrones visuales Liquid Glass para FIX-AI NEXT."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ThemeSwitcher />
            <ExportButton type="tickets" />
          </div>
        }
      />

      {/* Brand Identity & Logo */}
      <section style={{ marginBottom: 'var(--spacing-12)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-4)', fontSize: 'var(--font-size-2xl)' }}>1. Identidad de Marca (BrandLogo)</h2>
        <Card>
          <CardBody>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                <BrandLogo size="sm" showText />
                <small className="text-secondary">Tamaño Pequeño (sm)</small>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                <BrandLogo size="md" showText />
                <small className="text-secondary">Tamaño Mediano (md)</small>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                <BrandLogo size="lg" showText />
                <small className="text-secondary">Tamaño Grande (lg)</small>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Color Palette & Tokens */}
      <section style={{ marginBottom: 'var(--spacing-12)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-4)', fontSize: 'var(--font-size-2xl)' }}>2. Paleta de Colores y Tokens Semánticos</h2>

        <h3 style={{ marginBottom: 'var(--spacing-3)', fontSize: 'var(--font-size-lg)' }}>Colores Primarios (Blue Scale)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '0.75rem', marginBottom: 'var(--spacing-6)' }}>
          {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
            <div key={shade} style={{ textAlign: 'center' }}>
              <div
                style={{
                  height: '60px',
                  backgroundColor: `var(--color-primary-${shade})`,
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--spacing-1)',
                  border: '1px solid var(--color-border-light)',
                }}
              />
              <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>{shade}</div>
            </div>
          ))}
        </div>

        <h3 style={{ marginBottom: 'var(--spacing-3)', fontSize: 'var(--font-size-lg)' }}>Colores Semánticos de Estado (WCAG AA/AAA)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: 'var(--spacing-6)' }}>
          {[
            { name: 'Success', bg: 'var(--color-success-500)', lightBg: 'var(--color-success-50)', text: 'var(--color-success-700)' },
            { name: 'Warning', bg: 'var(--color-warning-500)', lightBg: 'var(--color-warning-50)', text: 'var(--color-warning-800)' },
            { name: 'Error / Danger', bg: 'var(--color-error-500)', lightBg: 'var(--color-error-50)', text: 'var(--color-error-700)' },
            { name: 'Info', bg: 'var(--color-info-500)', lightBg: 'var(--color-info-50)', text: 'var(--color-info-700)' },
          ].map((col) => (
            <div key={col.name} style={{ padding: '1rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-medium)' }}>
              <div style={{ height: '32px', backgroundColor: col.bg, borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }} />
              <div style={{ padding: '0.35rem 0.5rem', backgroundColor: col.lightBg, color: col.text, borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center' }}>
                {col.name}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Buttons System */}
      <section style={{ marginBottom: 'var(--spacing-12)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-4)', fontSize: 'var(--font-size-2xl)' }}>3. Botones y Variantes Polimórficas (Button)</h2>
        <Card>
          <CardBody>
            <h3 style={{ marginBottom: 'var(--spacing-3)', fontSize: 'var(--font-size-md)' }}>Variantes Semánticas</h3>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: 'var(--spacing-6)' }}>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="success">Success</Button>
              <Button variant="warning">Warning</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="glass">Glass</Button>
            </div>

            <h3 style={{ marginBottom: 'var(--spacing-3)', fontSize: 'var(--font-size-md)' }}>Tamaños y Estados</h3>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: 'var(--spacing-6)' }}>
              <Button size="sm">Small (sm)</Button>
              <Button size="base">Base</Button>
              <Button size="lg">Large (lg)</Button>
              <Button size="sm" isLoading>Cargando</Button>
              <Button size="sm" disabled>Deshabilitado</Button>
              <Button size="sm" variant="secondary" leftIcon={<span>←</span>}>Con Icono Izq.</Button>
              <Button size="sm" variant="primary" rightIcon={<span>→</span>}>Con Icono Der.</Button>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Badges and Domain Status */}
      <section style={{ marginBottom: 'var(--spacing-12)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-4)', fontSize: 'var(--font-size-2xl)' }}>4. Badges e Insignias de Dominio (TicketStatusBadge)</h2>
        <Card>
          <CardBody>
            <h3 style={{ marginBottom: 'var(--spacing-3)', fontSize: 'var(--font-size-md)' }}>Badges Genéricos</h3>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: 'var(--spacing-6)' }}>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="gray">Gray</Badge>
            </div>

            <h3 style={{ marginBottom: 'var(--spacing-3)', fontSize: 'var(--font-size-md)' }}>Estados de Tickets de Reparación</h3>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <TicketStatusBadge status="OPEN" />
              <TicketStatusBadge status="IN_PROGRESS" />
              <TicketStatusBadge status="WAITING_FOR_PARTS" />
              <TicketStatusBadge status="RESOLVED" />
              <TicketStatusBadge status="CLOSED" />
              <TicketStatusBadge status="CANCELLED" />
            </div>
          </CardBody>
        </Card>
      </section>

      {/* KPI & Stat Cards */}
      <section style={{ marginBottom: 'var(--spacing-12)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-4)', fontSize: 'var(--font-size-2xl)' }}>5. Tarjetas de Métricas (StatCard)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <StatCard
            title="Tickets Activos"
            value="38"
            label="12 pendientes hoy"
            icon={<span>📋</span>}
          />
          <StatCard
            title="Ingresos del Mes"
            value="Q 24,580.00"
            label="+8.2% vs mes anterior"
            icon={<span>💰</span>}
          />
          <StatCard
            title="Repuestos en Stock Crítico"
            value="6"
            label="Requieren reorden urgente"
            icon={<span>⚠️</span>}
          />
          <StatCard
            title="Eficiencia Técnica"
            value="94.2%"
            label="SLA cumplido a tiempo"
            icon={<span>⚡</span>}
          />
        </div>
      </section>

      {/* Form Controls & Search */}
      <section style={{ marginBottom: 'var(--spacing-12)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-4)', fontSize: 'var(--font-size-2xl)' }}>6. Formularios y Búsqueda (SearchInputGroup, Input, Select, Textarea)</h2>
        <Card>
          <CardBody>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', maxWidth: '650px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  Buscador Rápido con Atajo de Teclado (SearchInputGroup)
                </label>
                <SearchInputGroup
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSearch={() => alert(`Buscando: ${searchQuery}`)}
                  placeholder="Presiona / para buscar..."
                  buttonText="Buscar"
                  ariaLabel="Buscar componentes"
                />
              </div>

              <Input
                label="Nombre del Cliente"
                placeholder="Ej. Juan Pérez"
                helper="Nombre completo según documento de identificación"
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input
                  label="Correo Electrónico"
                  type="email"
                  placeholder="cliente@ejemplo.com"
                />
                <Select
                  label="Estado Inicial"
                  options={statusOptions}
                  placeholder="Selecciona estado..."
                />
              </div>

              <Textarea
                label="Diagnóstico / Notas de Recepción"
                placeholder="Describe los síntomas y estado físico del equipo..."
                rows={3}
              />
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Data Table & Pagination */}
      <section style={{ marginBottom: 'var(--spacing-12)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-4)', fontSize: 'var(--font-size-2xl)' }}>7. Tablas de Datos y Paginación (DataTable & PaginationControls)</h2>
        <Card>
          <CardBody>
            <DataTable columns={sampleColumns} data={sampleData} />
            <div style={{ marginTop: '1rem' }}>
              <PaginationControls
                currentPage={currentPage}
                totalPages={4}
                totalItems={sampleData.length * 4}
                hasNextPage={currentPage < 4}
                hasPrevPage={currentPage > 1}
              />
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Modal / Dialog */}
      <section style={{ marginBottom: 'var(--spacing-12)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-4)', fontSize: 'var(--font-size-2xl)' }}>8. Modales y Diálogos (Modal)</h2>
        <Card>
          <CardBody>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              Modal accesible con soporte para cierre con tecla Escape, foco accesible y backdrop blur Liquid Glass.
            </p>
            <Button variant="primary" size="base" onClick={() => setIsModalOpen(true)}>
              Abrir Modal de Ejemplo
            </Button>

            <Modal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              title="Registrar Nuevo Repuesto"
              footer={
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', width: '100%' }}>
                  <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setIsModalOpen(false)}>
                    Guardar Repuesto
                  </Button>
                </div>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p className="text-secondary" style={{ fontSize: '0.875rem', margin: 0 }}>
                  Ingresa los datos del componente para el inventario
                </p>
                <Input label="Nombre del Repuesto" placeholder="Ej. Pantalla OLED iPhone 14" />
                <Input label="Código / SKU" placeholder="Ej. SCR-IP14-01" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <Input label="Precio Costo (Q)" type="number" placeholder="150.00" />
                  <Input label="Precio Venta (Q)" type="number" placeholder="320.00" />
                </div>
              </div>
            </Modal>
          </CardBody>
        </Card>
      </section>

      {/* Alerts and Feedback */}
      <section style={{ marginBottom: 'var(--spacing-12)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-4)', fontSize: 'var(--font-size-2xl)' }}>9. Alertas y Mensajes de Estado (Alert)</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Alert variant="success">
            <strong>Operación Exitosa:</strong> La orden de servicio ha sido creada y asignada al técnico.
          </Alert>
          <Alert variant="warning">
            <strong>Advertencia:</strong> El stock de pantallas para iPhone 13 se encuentra por debajo del nivel mínimo.
          </Alert>
          <Alert variant="error">
            <strong>Error:</strong> No se pudo procesar el pago debido a un error en la pasarela.
          </Alert>
          <Alert variant="info">
            <strong>Información:</strong> El cliente ha autorizado el presupuesto de repuestos adicionales.
          </Alert>
        </div>
      </section>

    </div>
  );
}
