'use client';

import { useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { getReportData } from '@/lib/report-actions';
import { formatCurrency } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';
import styles from './reports.module.css';

// Lazy-load: recharts no se incluye en el bundle inicial (Fase 2.5)
const FinanceHistoryChart = dynamic(
  () => import('./ReportsCharts').then((m) => m.FinanceHistoryChart),
  { ssr: false, loading: () => <div style={{ height: 300 }} aria-busy="true" /> }
);
const TicketsByStatusChart = dynamic(
  () => import('./ReportsCharts').then((m) => m.TicketsByStatusChart),
  { ssr: false, loading: () => <div style={{ height: 300 }} aria-busy="true" /> }
);

interface Props {
  initialData: any;
}

export default function ReportsClient({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  // Date range state
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  const handleUpdate = () => {
    startTransition(async () => {
      const newData = await getReportData(new Date(startDate || ''), new Date(endDate || ''));
      setData(newData);
    });
  };

  const statusData = data.ticketsByStatus.map((s: any) => ({
    name: s.status,
    value: s.count
  }));


  return (
    <div className={styles['reportsPage']}>
      <PageHeader
        title="Reportes y Estadísticas"
        actions={
          <div className={styles['filters']}>
            <div className={styles['filterGroup']}>
              <label>Desde</label>
              <input 
                type="date" 
                className={styles['input']} 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className={styles['filterGroup']}>
              <label>Hasta</label>
              <input 
                type="date" 
                className={styles['input']}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <button 
              className={styles['input']} 
              style={{ 
                  marginTop: 'auto', 
                  cursor: 'pointer', 
                  backgroundColor: 'var(--color-primary-600)', 
                  color: 'white',
                  border: 'none',
                  fontWeight: 600,
                  opacity: isPending ? 0.7 : 1
              }}
              onClick={handleUpdate}
              disabled={isPending}
            >
              {isPending ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>
        }
      />

      <div className={styles['grid']}>
        {/* Financial Overview */}
        <div className={styles['card']} style={{ gridColumn: 'span 2' }}>
          <h2 className={styles['cardTitle']}>Ingresos Totales</h2>
          <div className={styles['statGrid']} style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '2rem' }}>
            <div className={styles['statItem']}>
              <span className={styles['statLabel']}>Facturación</span>
              <span className={`${styles['statValue']} ${styles['valueInvoice']}`}>
                {formatCurrency(data.finances.invoiceRevenue)}
              </span>
            </div>
            <div className={styles['statItem']}>
              <span className={styles['statLabel']}>Ventas POS</span>
              <span className={`${styles['statValue']} ${styles['valuePos']}`}>
                {formatCurrency(data.finances.posRevenue)}
              </span>
            </div>
            <div className={styles['statItem']}>
              <span className={styles['statLabel']}>Total</span>
              <span className={`${styles['statValue']} ${styles['valueTotal']}`}>
                {formatCurrency(data.finances.totalRevenue)}
              </span>
            </div>
          </div>
          <div style={{ height: 300 }}>
            <FinanceHistoryChart history={data.finances.history} />
          </div>
        </div>

        {/* Ticket Volume by Status */}
        <div className={styles['card']}>
          <h2 className={styles['cardTitle']}>Estado de Tickets</h2>
          <div style={{ height: 300 }}>
            <TicketsByStatusChart statusData={statusData} />
          </div>
        </div>

        {/* Top Selling Products */}
        <div className={styles['card']}>
            <h2 className={styles['cardTitle']}>Top Ventas (POS)</h2>
            <div className={styles['tableContainer']} style={{ maxHeight: '300px' }}>
                <table className={styles['table']}>
                  <caption className="sr-only">Top de productos más vendidos en POS</caption>
                    <thead>
                        <tr>
                            <th scope="col">Producto</th>
                            <th scope="col" style={{ textAlign: 'center' }}>Cant.</th>
                            <th scope="col" style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.inventory.topSelling.length === 0 ? (
                            <tr><td colSpan={3} style={{textAlign: 'center', color: 'var(--color-text-tertiary)'}}>Sin ventas en este periodo</td></tr>
                        ) : (
                            data.inventory.topSelling.map((p: any) => (
                                <tr key={p.name}>
                                    <td><strong>{p.name}</strong></td>
                                    <td style={{ textAlign: 'center' }}>{p.quantity}</td>
                                    <td style={{ textAlign: 'right' }}><strong>{formatCurrency(p.total)}</strong></td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Inventory Overview */}
        <div className={styles['card']}>
          <h2 className={styles['cardTitle']}>Inventario Global</h2>
          <div className={styles['statGrid']} style={{ height: '100%', alignContent: 'center' }}>
            <div className={styles['statItem']}>
              <span className={styles['statLabel']}>Total Items Únicos</span>
              <span className={styles['statValue']}>{data.inventory.totalItems}</span>
            </div>
            <div className={styles['statItem']}>
              <span className={styles['statLabel']}>Unidades en Stock</span>
              <span className={styles['statValue']}>{data.inventory.totalQuantity}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Technician Productivity */}
      <div className={styles['card']} style={{ marginTop: '1.5rem' }}>
        <h2 className={styles['cardTitle']}>Productividad de Técnicos</h2>
        <div className={styles['tableContainer']}>
          <table className={styles['table']}>
            <caption className="sr-only">Productividad de técnicos</caption>
            <thead>
              <tr>
                <th scope="col">Técnico</th>
                <th scope="col" style={{ textAlign: 'center' }}>Tickets Resueltos</th>
                <th scope="col" style={{ textAlign: 'center' }}>Tickets Activos</th>
                <th scope="col" style={{ textAlign: 'center' }}>Total Asignados</th>
                <th scope="col">Efectividad</th>
              </tr>
            </thead>
            <tbody>
              {data.technicianMetrics.map((tech: any) => {
                const efficiency = tech.total ? ((tech.closed / tech.total) * 100) : 0;
                return (
                    <tr key={tech.name}>
                    <td><strong>{tech.name}</strong></td>
                    <td style={{ textAlign: 'center' }}>{tech.closed}</td>
                    <td style={{ textAlign: 'center' }}>{tech.active}</td>
                    <td style={{ textAlign: 'center' }}>{tech.total}</td>
                    <td style={{ width: '30%' }}>
                        <div className={styles['progressContainer']}>
                            <div className={styles['progressBar']}>
                                <div className={styles['progressFill']} style={{ 
                                    width: `${efficiency}%`, 
                                    backgroundColor: efficiency > 75 ? 'var(--color-success-500)' : efficiency > 40 ? 'var(--color-warning-500)' : 'var(--color-error-500)' 
                                }} />
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, width: '40px' }}>{efficiency.toFixed(0)}%</span>
                        </div>
                    </td>
                    </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
