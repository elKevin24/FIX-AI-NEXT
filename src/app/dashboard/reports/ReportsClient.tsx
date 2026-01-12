'use client';

import { useState, useEffect, useTransition } from 'react';
import { getReportData } from '@/lib/report-actions';
import styles from './reports.module.css';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
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
        {/* Ticket Volume by Status */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Volumen de Tickets por Estado</h2>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Overview */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Resumen Financiero</h2>
          <div className={styles.statGrid}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Ingresos por Mano de Obra</span>
              <span className={styles.statValue}>
                ${data.finances.totalLaborRevenue.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Ventas de Repuestos</span>
              <span className={styles.statValue}>
                ${data.finances.totalPartsRevenue.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Utilidad Neta</span>
              <span className={styles.statValue} style={{ color: '#10b981' }}>
                ${data.finances.netProfit.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div style={{ height: 200, marginTop: '2rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Labor', ingreso: data.finances.totalLaborRevenue },
                { name: 'Repuestos', ingreso: data.finances.totalPartsRevenue, costo: data.finances.totalPartsCost }
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="ingreso" fill="#3b82f6" name="Ingreso" />
                <Bar dataKey="costo" fill="#ef4444" name="Costo" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Overview */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Resumen de Inventario</h2>
          <div className={styles.statGrid}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total de Repuestos</span>
              <span className={styles.statValue}>{data.inventory.totalItems}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Alertas de Stock</span>
              <span className={styles.statValue + (data.inventory.lowStockParts > 0 ? ' ' + styles.warning : '')}>
                {data.inventory.lowStockParts}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Valor en Almacén</span>
              <span className={styles.statValue}>
                ${data.inventory.totalStockValue.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Technician Productivity */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Productividad de Técnicos</h2>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Técnico</th>
                <th>Tickets Resueltos</th>
                <th>Tickets Activos</th>
                <th>Total Asignados</th>
                <th>Progreso</th>
              </tr>
            </thead>
            <tbody>
              {data.technicianMetrics.map((tech: any) => (
                <tr key={tech.name}>
                  <td>{tech.name}</td>
                  <td>{tech.closed}</td>
                  <td>{tech.active}</td>
                  <td>{tech.total}</td>
                  <td>
                    <div style={{ 
                        width: '100px', 
                        height: '8px', 
                        background: '#e2e8f0', 
                        borderRadius: '4px',
                        overflow: 'hidden'
                    }}>
                        <div style={{ 
                            width: `${(tech.closed / (tech.total || 1)) * 100}%`, 
                            height: '100%', 
                            background: '#10b981' 
                        }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
