'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { Badge, Button } from '@/components/ui';
import ExportButton from '@/components/ui/ExportButton';
import styles from './invoices.module.css';

interface Invoice {
  id: string;
  invoiceNumber: string;
  createdAt: Date;
  customerName: string;
  customerNIT: string | null;
  status: string;
  total: number | string;
  ticket?: {
    ticketNumber?: string | null;
    deviceType?: string | null;
    deviceModel?: string | null;
  } | null;
}

interface InvoicesClientProps {
  initialInvoices: Invoice[];
}

export default function InvoicesClient({ initialInvoices }: InvoicesClientProps) {
  const [invoices] = useState(initialInvoices);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrado local
  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
    const matchesSearch = inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Estadísticas rápidas
  const stats = {
    total: invoices.reduce((sum, inv) => sum + Number(inv.total), 0),
    paid: invoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + Number(inv.total), 0),
    pending: invoices.filter(inv => inv.status === 'PENDING').reduce((sum, inv) => sum + Number(inv.total), 0),
    count: invoices.length
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'gray'> = {
      PAID: 'success',
      PENDING: 'warning',
      CANCELLED: 'error',
      OVERDUE: 'error',
      DRAFT: 'gray'
    };
    const labels: Record<string, string> = {
      PAID: 'Pagado',
      PENDING: 'Pendiente',
      CANCELLED: 'Cancelado',
      OVERDUE: 'Vencido',
      DRAFT: 'Borrador'
    };
    return <Badge variant={variants[status] || 'gray'}>{labels[status] || status}</Badge>;
  };

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: 'invoiceNumber',
      header: 'No. Factura',
      cell: ({ row }) => <span className="font-bold text-gray-800">{row.original.invoiceNumber}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Fecha',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      accessorKey: 'customerName',
      header: 'Cliente',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{row.original.customerName}</span>
          <span className="text-xs text-gray-500">NIT: {row.original.customerNIT || 'C/F'}</span>
        </div>
      ),
    },
    {
      id: 'ticket',
      header: 'Ticket',
      cell: ({ row }) => row.original.ticket ? (
        <div className="flex flex-col text-xs text-gray-500">
          <span>#{row.original.ticket.ticketNumber}</span>
          <span>{row.original.ticket.deviceType} {row.original.ticket.deviceModel}</span>
        </div>
      ) : <span className="text-gray-400">-</span>,
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: 'total',
      header: 'Total',
      cell: ({ row }) => <span className="font-bold text-gray-800">{formatCurrency(Number(row.original.total))}</span>,
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <Link href={`/dashboard/invoices/${row.original.id}`}>
          <Button variant="ghost" size="sm">Ver Detalle</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Facturación</h1>
          <p>Consulta y gestiona las facturas generadas a partir de tickets.</p>
        </div>
        <ExportButton type="invoices" />
      </header>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Facturado</span>
          <span className={styles.statValue}>{formatCurrency(stats.total)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Cobrado</span>
          <span className={`${styles.statValue} ${styles.valuePaid}`}>{formatCurrency(stats.paid)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Pendiente</span>
          <span className={`${styles.statValue} ${styles.valuePending}`}>{formatCurrency(stats.pending)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Cant. Facturas</span>
          <span className={styles.statValue}>{stats.count}</span>
        </div>
      </section>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Buscar</label>
          <input 
            type="text" 
            placeholder="No. Factura o Cliente..." 
            className={styles.input}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label>Estado</label>
          <select 
            className={styles.select}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="PAID">Pagados</option>
            <option value="PENDING">Pendientes</option>
            <option value="CANCELLED">Cancelados</option>
          </select>
        </div>
      </div>

      <DataTable columns={columns} data={filteredInvoices} />
    </div>
  );
}