'use client';

import { useState, useTransition } from 'react';
import { getReportData } from '@/lib/report-actions';
import styles from './reports.module.css';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
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
                backgroundColor: '#3b82f6', 
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
              <span className={styles.statValue} style={{ color: '#3b82f6' }}>
                {formatCurrency(data.finances.invoiceRevenue)}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Ventas POS</span>
              <span className={styles.statValue} style={{ color: '#8b5cf6' }}>
                {formatCurrency(data.finances.posRevenue)}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total</span>
              <span className={styles.statValue} style={{ color: '#10b981' }}>
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
                <Line type="monotone" dataKey="invoice" name="Facturación" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pos" name="Ventas POS" stroke="#8b5cf6" strokeWidth={2} dot={false} />
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
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Products */}
        <div className={styles.card}>
            <h2 className={styles.cardTitle}>Top Ventas (POS)</h2>
            <div className={styles.tableContainer} style={{ maxHeight: '300px', overflow: 'auto' }}>
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
                            <tr><td colSpan={3} style={{textAlign: 'center', color: '#999'}}>Sin ventas en este periodo</td></tr>
                        ) : (
                            data.inventory.topSelling.map((p: any) => (
                                <tr key={p.name}>
                                    <td>{p.name}</td>
                                    <td style={{ textAlign: 'center' }}>{p.quantity}</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(p.total)}</td>
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
                <th>Tickets Resueltos</th>
                <th>Tickets Activos</th>
                <th>Total Asignados</th>
                <th>Efectividad</th>
              </tr>
            </thead>
            <tbody>
              {data.technicianMetrics.map((tech: any) => {
                const efficiency = tech.total ? ((tech.closed / tech.total) * 100) : 0;
                return (
                    <tr key={tech.name}>
                    <td>{tech.name}</td>
                    <td>{tech.closed}</td>
                    <td>{tech.active}</td>
                    <td>{tech.total}</td>
                    <td style={{ width: '30%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ 
                                flex: 1,
                                height: '8px', 
                                background: '#e2e8f0', 
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                <div style={{ 
                                    width: `${efficiency}%`, 
                                    height: '100%', 
                                    background: efficiency > 75 ? '#10b981' : efficiency > 40 ? '#f59e0b' : '#ef4444' 
                                }} />
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, width: '40px' }}>{efficiency.toFixed(0)}%</span>
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