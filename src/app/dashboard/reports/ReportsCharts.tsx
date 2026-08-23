'use client';

import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];

const formatCurrency = (val: number) => `Q${Number(val).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;

export function FinanceHistoryChart({ history }: { history: any[] }) {
  return (
    <ResponsiveContainer width="99%" height="100%">
      <LineChart data={history}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
            dataKey="date"
            tickFormatter={(date) => new Date(date).toLocaleDateString('es-GT', { month: 'short', day: 'numeric' })}
        />
        <YAxis />
        <Tooltip
            formatter={(value: any) => formatCurrency(Number(value))}
            labelFormatter={(date: any) => date ? new Date(date).toLocaleDateString('es-GT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
        />
        <Legend />
        <Line type="monotone" dataKey="invoice" name="Facturación" stroke="var(--color-primary-500)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="pos" name="Ventas POS" stroke="var(--color-secondary-500)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function TicketsByStatusChart({ statusData }: { statusData: any[] }) {
  return (
    <ResponsiveContainer width="99%" height="100%">
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
  );
}
