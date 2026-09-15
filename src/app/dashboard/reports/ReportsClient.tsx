'use client';

import { useState, useTransition } from 'react';
import { getReportData } from '@/lib/report-actions';
import styles from './reports.module.css';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

interface Props {
  initialData: any;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];

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
      const newData = await getReportData(new Date(startDate), new Date(endDate));
      setData(newData);
    });
  };

  const statusData = data.ticketsByStatus.map((s: any) => ({
    name: s.status,
    value: s.count
  }));

  const formatCurrency = (val: number) => `Q${Number(val).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;

  return (
    <div className={styles.reportsPage}>
      <header className={styles.header}>
        <h1>Reportes y Estadísticas</h1>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Desde</label>
            <input 
              type="date" 
              className={styles.input} 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Hasta</label>
            <input 
              type="date" 
              className={styles.input}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button 
            className={styles.input} 
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
      </header>

      <div className={styles.grid}>
        {/* Financial Overview */}
        <div className={styles.card} style={{ gridColumn: 'span 2' }}>
          <h2 className={styles.cardTitle}>Ingresos Totales</h2>
          <div className={styles.statGrid} style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '2rem' }}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Facturación</span>
              <span className={`${styles.statValue} ${styles.valueInvoice}`}>
                {formatCurrency(data.finances.invoiceRevenue)}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Ventas POS</span>
              <span className={`${styles.statValue} ${styles.valuePos}`}>
                {formatCurrency(data.finances.posRevenue)}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total</span>
              <span className={`${styles.statValue} ${styles.valueTotal}`}>
                {formatCurrency(data.finances.totalRevenue)}
              </span>
            </div>
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.finances.history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString('es-GT', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value))} 
                    labelFormatter={(date) => new Date(date).toLocaleDateString('es-GT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                />
                <Legend />
                <Line type="monotone" dataKey="invoice" name="Facturación" stroke="var(--color-primary-500)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pos" name="Ventas POS" stroke="var(--color-secondary-500)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ticket Volume by Status */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Estado de Tickets</h2>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Products */}
        <div className={styles.card}>
            <h2 className={styles.cardTitle}>Top Ventas (POS)</h2>
            <div className={styles.tableContainer} style={{ maxHeight: '300px' }}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th style={{ textAlign: 'center' }}>Cant.</th>
                            <th style={{ textAlign: 'right' }}>Total</th>
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
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Inventario Global</h2>
          <div className={styles.statGrid} style={{ height: '100%', alignContent: 'center' }}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total Items Únicos</span>
              <span className={styles.statValue}>{data.inventory.totalItems}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Unidades en Stock</span>
              <span className={styles.statValue}>{data.inventory.totalQuantity}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Technician Productivity */}
      <div className={styles.card} style={{ marginTop: '1.5rem' }}>
        <h2 className={styles.cardTitle}>Productividad de Técnicos</h2>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Técnico</th>
                <th style={{ textAlign: 'center' }}>Tickets Resueltos</th>
                <th style={{ textAlign: 'center' }}>Tickets Activos</th>
                <th style={{ textAlign: 'center' }}>Total Asignados</th>
                <th>Efectividad</th>
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
                        <div className={styles.progressContainer}>
                            <div className={styles.progressBar}>
                                <div className={styles.progressFill} style={{ 
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
