'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface TicketsByStatusData {
    status: string;
    count: number;
}

interface Props {
    data: TicketsByStatusData[];
}

const STATUS_COLORS: Record<string, string> = {
    'OPEN': '#3b82f6',           // Blue
    'IN_PROGRESS': '#f59e0b',    // Amber
    'WAITING_FOR_PARTS': '#8b5cf6', // Purple
    'RESOLVED': '#10b981',       // Green
    'CLOSED': '#6b7280',         // Gray
};

const STATUS_LABELS: Record<string, string> = {
    'OPEN': 'Abierto',
    'IN_PROGRESS': 'En Progreso',
    'WAITING_FOR_PARTS': 'Esperando Repuestos',
    'RESOLVED': 'Resuelto',
    'CLOSED': 'Cerrado',
};

export default function TicketsByStatusChart({ data }: Props) {
    // Transform data to include labels and colors
    const chartData = data.map(item => ({
        name: STATUS_LABELS[item.status] || item.status,
        value: item.count,
        color: STATUS_COLORS[item.status] || '#9ca3af',
    }));

    const totalTickets = data.reduce((sum, item) => sum + item.count, 0);

    if (totalTickets === 0) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '300px',
                color: '#9ca3af',
                fontSize: '14px'
            }}>
                No hay tickets para mostrar
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
