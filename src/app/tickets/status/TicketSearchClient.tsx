'use client';

import { useState } from 'react';
import Link from 'next/link';
import { searchTicket } from '@/lib/actions';
import TicketStatusCard from '@/components/tickets/TicketStatusCard';
import ThemeSwitcher from '@/components/ui/ThemeSwitcher';

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
                background: 'var(--color-bg-primary)',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-primary)', fontWeight: 'bold' }}>
                        <div style={{
                            width: '1.5rem',
                            height: '1.5rem',
                            background: 'var(--color-primary-600)',
                            borderRadius: '0.5rem',
                            border: 'none',
                            boxShadow: 'none',
                            outline: 'none',
                            overflow: 'hidden'
                        }}></div>
                        FIX-AI
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <ThemeSwitcher />
                        <Link href="/" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '0.875rem', outline: 'none' }}>Inicio</Link>
                    </div>
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
                            color: 'var(--color-text-primary)',
                            marginBottom: '0.5rem',
                            transition: 'all 0.3s ease'
                        }}>Estado de Reparación</h1>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>Consulta el progreso de tu equipo</p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'var(--color-surface)',
                            border: `1px solid ${error ? 'var(--color-error-600)' : 'var(--color-border-medium)'}`,
                            borderRadius: '1rem',
                            boxShadow: 'var(--shadow-sm)',
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
                                    color: 'var(--color-text-primary)',
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
                                    background: loading ? 'var(--color-gray-400)' : 'var(--color-primary-600)',
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
                            <p style={{ position: 'absolute', top: '100%', left: '0.25rem', marginTop: '0.5rem', color: 'var(--color-error-600)', fontSize: '0.75rem', fontWeight: '500' }}>
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
                                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-light)', color: 'var(--color-text-tertiary)', padding: '0.375rem 0.75rem', borderRadius: '1.25rem', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s ease' }}
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
                }

                .search-button:not(:disabled):active {
                    transform: scale(0.98) !important;
                }

                /* Animación para contenedor de búsqueda */
                .search-container:focus-within {
                    box-shadow: var(--shadow-md) !important;
                    transform: translateY(-2px);
                    border-color: var(--color-primary-600) !important;
                }

                /* Animación para botones de demo */
                .demo-button:hover {
                    background: var(--color-surface-hover) !important;
                    border-color: var(--color-primary-600) !important;
                    color: var(--color-primary-600) !important;
                    transform: translateY(-2px);
                }
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