'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TechnicianData {
    name: string;
    email: string;
    completed: number;
    inProgress: number;
    avgDays: number;
}

interface Props {
    data: TechnicianData[];
}

export default function TechnicianMetrics({ data }: Props) {
    if (data.length === 0) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '300px',
                color: '#94a3b8',
                fontSize: '0.875rem'
            }}>
                No hay datos de técnicos disponibles
            </div>
        );
    }

    // Transform data for the chart
    const chartData = data.map(tech => ({
        name: tech.name || tech.email.split('@')[0],
        'Completados': tech.completed,
        'En Progreso': tech.inProgress,
    }));

    return (
        <div>
            {/* Bar Chart */}
            <div style={{ width: '100%', height: '300px', marginBottom: '2rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                borderRadius: '0.5rem', 
                                border: 'none', 
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                            }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                        <Bar dataKey="Completados" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        <Bar dataKey="En Progreso" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Detailed Table */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'separate',
                    borderSpacing: 0,
                    fontSize: '0.875rem'
                }}>
                    <thead>
                        <tr style={{
                            backgroundColor: '#f8fafc',
                        }}>
                            <th style={{
                                padding: '0.75rem 1rem',
                                textAlign: 'left',
                                fontWeight: 600,
                                color: '#475569',
                                borderBottom: '1px solid #e2e8f0',
                                borderTopLeftRadius: '0.5rem'
                            }}>Técnico</th>
                            <th style={{
                                padding: '0.75rem 1rem',
                                textAlign: 'center',
                                fontWeight: 600,
                                color: '#475569',
                                borderBottom: '1px solid #e2e8f0'
                            }}>Completados</th>
                            <th style={{
                                padding: '0.75rem 1rem',
                                textAlign: 'center',
                                fontWeight: 600,
                                color: '#475569',
                                borderBottom: '1px solid #e2e8f0'
                            }}>En Progreso</th>
                            <th style={{
                                padding: '0.75rem 1rem',
                                textAlign: 'center',
                                fontWeight: 600,
                                color: '#475569',
                                borderBottom: '1px solid #e2e8f0',
                                borderTopRightRadius: '0.5rem'
                            }}>Tiempo Promedio</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((tech, index) => (
                            <tr key={tech.email} style={{
                                transition: 'background-color 0.2s'
                            }}>
                                <td style={{
                                    padding: '0.875rem 1rem',
                                    color: '#334155',
                                    borderBottom: '1px solid #f1f5f9'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                                            {tech.name || 'Sin nombre'}
                                        </div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: '#94a3b8'
                                        }}>
                                            {tech.email}
                                        </div>
                                    </div>
                                </td>
                                <td style={{
                                    padding: '0.875rem 1rem',
                                    textAlign: 'center',
                                    color: '#059669',
                                    fontWeight: 600,
                                    borderBottom: '1px solid #f1f5f9'
                                }}>
                                    {tech.completed}
                                </td>
                                <td style={{
                                    padding: '0.875rem 1rem',
                                    textAlign: 'center',
                                    color: '#d97706',
                                    fontWeight: 600,
                                    borderBottom: '1px solid #f1f5f9'
                                }}>
                                    {tech.inProgress}
                                </td>
                                <td style={{
                                    padding: '0.875rem 1rem',
                                    textAlign: 'center',
                                    color: '#64748b',
                                    borderBottom: '1px solid #f1f5f9'
                                }}>
                                    {tech.avgDays > 0 ? (
                                        <span style={{ 
                                            padding: '0.25rem 0.5rem', 
                                            background: '#f1f5f9', 
                                            borderRadius: '9999px',
                                            fontSize: '0.75rem'
                                        }}>
                                            {tech.avgDays.toFixed(1)} días
                                        </span>
                                    ) : (
                                        <span style={{ color: '#cbd5e1' }}>-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
