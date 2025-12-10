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
                color: '#9ca3af',
                fontSize: '14px'
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
            <div style={{ width: '100%', height: '300px', marginBottom: '1.5rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Completados" fill="#10b981" />
                        <Bar dataKey="En Progreso" fill="#f59e0b" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Detailed Table */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.875rem'
                }}>
                    <thead>
                        <tr style={{
                            backgroundColor: '#f9fafb',
                            borderBottom: '2px solid #e5e7eb'
                        }}>
                            <th style={{
                                padding: '0.75rem',
                                textAlign: 'left',
                                fontWeight: 600,
                                color: '#374151'
                            }}>Técnico</th>
                            <th style={{
                                padding: '0.75rem',
                                textAlign: 'center',
                                fontWeight: 600,
                                color: '#374151'
                            }}>Completados</th>
                            <th style={{
                                padding: '0.75rem',
                                textAlign: 'center',
                                fontWeight: 600,
                                color: '#374151'
                            }}>En Progreso</th>
                            <th style={{
                                padding: '0.75rem',
                                textAlign: 'center',
                                fontWeight: 600,
                                color: '#374151'
                            }}>Tiempo Promedio</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((tech, index) => (
                            <tr key={tech.email} style={{
                                borderBottom: '1px solid #e5e7eb',
                                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb'
                            }}>
                                <td style={{
                                    padding: '0.75rem',
                                    color: '#1f2937'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>
                                            {tech.name || 'Sin nombre'}
                                        </div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: '#6b7280'
                                        }}>
                                            {tech.email}
                                        </div>
                                    </div>
                                </td>
                                <td style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    color: '#10b981',
                                    fontWeight: 600
                                }}>
                                    {tech.completed}
                                </td>
                                <td style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    color: '#f59e0b',
                                    fontWeight: 600
                                }}>
                                    {tech.inProgress}
                                </td>
                                <td style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    color: '#6b7280'
                                }}>
                                    {tech.avgDays > 0 ? (
                                        <span>
                                            {tech.avgDays.toFixed(1)} día{tech.avgDays !== 1 ? 's' : ''}
                                        </span>
                                    ) : (
                                        <span style={{ color: '#d1d5db' }}>-</span>
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
