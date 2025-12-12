'use client';

import { useState } from 'react';
import Link from 'next/link';
import { searchTicket } from '@/lib/actions';
import TicketStatusCard from '@/components/tickets/TicketStatusCard';

interface DemoTicket {
    id: string;
    title: string;
    deviceType: string | null;
}

export default function TicketSearchClient({ demoTickets = [] }: { demoTickets?: DemoTicket[] }) {
    const [ticketId, setTicketId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [ticket, setTicket] = useState<any | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticketId.trim()) return;

        setLoading(true);
        setError('');
        setTicket(null);

        try {
            const result = await searchTicket(ticketId.trim());
            if (result) {
                setTicket(result);
            } else {
                setError('ID no encontrado.');
            }
        } catch (err) {
            console.error(err);
            setError('Error de conexión.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#ffffff',
            zIndex: -1
        }}></div>
        <div style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: ticket ? '0.75rem' : '1.25rem',
            fontFamily: 'system-ui, sans-serif',
            overflowY: 'auto'
        }}>
            
            {/* Navbar Simple */}
            <nav style={{ width: '100%', maxWidth: '50rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: ticket ? '0.5rem' : '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1a202c', fontWeight: 'bold' }}> {/* Texto oscuro */}
                    <div style={{
                        width: '1.5rem',
                        height: '1.5rem',
                        background: '#2563eb', // Blue 600
                        borderRadius: '0.5rem',
                        border: 'none',
                        boxShadow: 'none',
                        outline: 'none',
                        overflow: 'hidden'
                    }}></div>
                    FIX-AI
                </div>
                <Link href="/" style={{ color: '#475569', textDecoration: 'none', fontSize: '0.875rem', outline: 'none' }}>Inicio</Link> {/* Slate 600 */}
            </nav>

            {/* Buscador Compacto */}
            <div style={{
                width: '100%',
                maxWidth: '26.25rem',
                transition: 'all 0.3s ease'
            }}>
                <div style={{
                    textAlign: 'center',
                    marginBottom: '1rem',
                    transition: 'all 0.3s ease'
                }}>
                    <h1 style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: '#1a202c',
                        marginBottom: '0.5rem',
                        transition: 'all 0.3s ease'
                    }}>Estado de Reparación</h1>
                    <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1rem' }}>Consulta el progreso de tu equipo</p>
                </div>

                <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: '#ffffff',
                        border: `1px solid ${error ? '#ef4444' : '#94a3b8'}`, // Slate 400 para mejor contraste
                        borderRadius: '1rem',
                        boxShadow: '0 0.25rem 0.375rem -0.0625rem rgba(0, 0, 0, 0.1)',
                        overflow: 'hidden',
                        isolation: 'isolate',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    className="search-container"
                    >
                        <input
                            type="text"
                            value={ticketId}
                            onChange={(e) => { setTicketId(e.target.value); setError(''); }}
                            placeholder="Ingresa tu ID de Ticket (ej: 90287b37)"
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                padding: '0.625rem 1rem',
                                color: '#1a202c',
                                outline: 'none',
                                fontSize: '0.875rem',
                                fontFamily: 'monospace'
                            }}
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="search-button"
                            style={{
                                background: loading ? '#94a3b8' : '#2563eb', // Blue 600
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.75rem',
                                padding: '0.625rem 1.25rem',
                                margin: '0.25rem',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                cursor: loading ? 'wait' : 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                outline: 'none',
                                boxShadow: 'none',
                                overflow: 'hidden',
                                WebkitAppearance: 'none',
                                MozAppearance: 'none',
                                appearance: 'none',
                                transform: loading ? 'scale(0.95)' : 'scale(1)'
                            }}
                        >
                            <span style={{
                                display: 'inline-block',
                                animation: loading ? 'pulse 1.5s ease-in-out infinite' : 'none'
                            }}>
                                {loading ? '...' : 'Buscar'}
                            </span>
                        </button>
                    </div>
                    {error && (
                        <p style={{ position: 'absolute', top: '100%', left: '0.25rem', marginTop: '0.5rem', color: '#dc2626', fontSize: '0.75rem', fontWeight: '500' }}>
                            {error}
                        </p>
                    )}
                </form>

                {/* Ejemplos Dinámicos */}
                {!ticket && demoTickets.length > 0 && (
                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {demoTickets.map((demo) => (
                            <button 
                                key={demo.id}
                                onClick={() => setTicketId(demo.id.slice(0, 8))} 
                                className="demo-button" 
                                style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#64748b', padding: '0.375rem 0.75rem', borderRadius: '1.25rem', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s ease' }}
                            >
                                Demo {demo.deviceType || 'Equipo'}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Resultado (Card) */}
            {ticket && (
                <div style={{
                    width: '100%',
                    maxWidth: '50rem',
                    animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                    marginTop: '2rem'
                }}>
                    <TicketStatusCard ticket={ticket} />
                </div>
            )}

            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                /* Animación de hover para el botón Buscar */
                .search-button:not(:disabled):hover {
                    transform: scale(1.05) !important;
                    box-shadow: 0 0.5rem 1rem rgba(37, 99, 235, 0.3) !important; /* Blue 600 shadow */
                }

                .search-button:not(:disabled):active {
                    transform: scale(0.98) !important;
                }

                /* Animación para contenedor de búsqueda */
                .search-container:focus-within {
                    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.1) !important;
                    transform: translateY(-2px);
                    border-color: #2563eb !important; /* Blue 600 border on focus */
                }

                /* Animación para botones de demo */
                .demo-button:hover {
                    background: #f8fafc !important;
                    border-color: #2563eb !important;
                    color: #2563eb !important;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(37, 99, 235, 0.15);
                }

                .demo-button:active {
                    transform: scale(0.95);
                }

                /* Desactivar TODOS los outlines, box-shadows y efectos de focus */
                *,
                *::before,
                *::after {
                    outline: none !important;
                    -webkit-tap-highlight-color: transparent !important;
                }

                *:focus,
                *:focus-visible,
                *:active,
                *:hover {
                    outline: none !important;
                    box-shadow: none !important;
                    -webkit-box-shadow: none !important;
                    -moz-box-shadow: none !important;
                }

                button:focus,
                button:focus-visible,
                button:active,
                button:hover {
                    outline: none !important;
                    box-shadow: none !important;
                }

                input:focus,
                input:focus-visible,
                input:active {
                    outline: none !important;
                    box-shadow: none !important;
                }

                div:focus,
                div:focus-visible {
                    outline: none !important;
                    box-shadow: none !important;
                }
            `}</style>
        </div>
        </>
    );
}