'use client';

import { useState } from 'react';
import Link from 'next/link';
import { searchTicket } from '@/lib/actions';
import TicketStatusCard from '@/components/tickets/TicketStatusCard';

export default function TicketSearchPage() {
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
                        background: '#3b82f6',
                        borderRadius: '0.5rem',
                        border: 'none',
                        boxShadow: 'none',
                        outline: 'none',
                        overflow: 'hidden'
                    }}></div> {/* Azul */}
                    FIX-AI
                </div>
                <Link href="/" style={{ color: '#4a5568', textDecoration: 'none', fontSize: '0.875rem', outline: 'none' }}>Inicio</Link> {/* Texto gris */}
            </nav>

            {/* Buscador Compacto */}
            <div style={{
                width: '100%',
                maxWidth: '26.25rem',
                marginBottom: ticket ? '0.75rem' : '0', // Espacio si hay resultados
                transition: 'all 0.3s ease'
            }}>
                <div style={{
                    textAlign: 'center',
                    marginBottom: ticket ? '0.5rem' : '1rem',
                    transition: 'all 0.3s ease'
                }}>
                    <h1 style={{
                        fontSize: ticket ? '1.125rem' : '1.5rem',
                        fontWeight: '700',
                        color: '#1a202c',
                        marginBottom: ticket ? '0' : '0.5rem',
                        transition: 'all 0.3s ease'
                    }}>Estado de Reparación</h1>
                    {!ticket && (
                        <p style={{ fontSize: '0.875rem', color: '#4a5568' }}>Consulta el progreso de tu equipo</p>
                    )}
                </div>

                <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: '#ffffff', // Fondo blanco para el input
                        border: `1px solid ${error ? '#ef4444' : '#cbd5e0'}`, // Borde gris claro
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
                                color: '#1a202c', // Texto oscuro en input
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
                                background: loading ? '#a0aec0' : '#3b82f6',
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
                        <p style={{ position: 'absolute', top: '100%', left: '0.25rem', marginTop: '0.5rem', color: '#ef4444', fontSize: '0.75rem' }}>
                            {error}
                        </p>
                    )}
                </form>

                {/* Ejemplos (Solo si no hay ticket visible para no ensuciar) */}
                {!ticket && (
                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button onClick={() => setTicketId('5f8320f6')} className="demo-button" style={{ background: '#ffffff', border: '1px solid #cbd5e0', color: '#4a5568', padding: '0.375rem 0.75rem', borderRadius: '1.25rem', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s ease' }}>Demo Laptop</button>
                        <button onClick={() => setTicketId('47d8cd53')} className="demo-button" style={{ background: '#ffffff', border: '1px solid #cbd5e0', color: '#4a5568', padding: '0.375rem 0.75rem', borderRadius: '1.25rem', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s ease' }}>Demo TV</button>
                    </div>
                )}
            </div>

            {/* Resultado (Card) */}
            {ticket && (
                <div style={{
                    width: '100%',
                    maxWidth: '50rem',
                    animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    {/* Nota: La TicketStatusCard tiene su propio modo oscuro. Aquí se mezcla. */}
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
                    box-shadow: 0 0.5rem 1rem rgba(59, 130, 246, 0.3) !important;
                }

                .search-button:not(:disabled):active {
                    transform: scale(0.98) !important;
                }

                /* Animación para contenedor de búsqueda */
                .search-container:focus-within {
                    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
                    transform: translateY(-2px);
                }

                /* Animación para botones de demo */
                .demo-button:hover {
                    background: #f7fafc !important;
                    border-color: #3b82f6 !important;
                    color: #3b82f6 !important;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.15);
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
                    border-color: #cbd5e0 !important;
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
