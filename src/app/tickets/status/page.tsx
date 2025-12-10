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
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #e0f2f7 0%, #ffffff 100%)', // Degradado suave (similar al original)
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px',
            fontFamily: 'system-ui, sans-serif'
        }}>
            
            {/* Navbar Simple */}
            <nav style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1a202c', fontWeight: 'bold' }}> {/* Texto oscuro */}
                    <div style={{ width: '24px', height: '24px', background: '#3b82f6', borderRadius: '6px' }}></div> {/* Azul */}
                    FIX-AI
                </div>
                <Link href="/" style={{ color: '#4a5568', textDecoration: 'none', fontSize: '14px' }}>Inicio</Link> {/* Texto gris */}
            </nav>

            {/* Buscador Compacto */}
            <div style={{
                width: '100%',
                maxWidth: '420px',
                marginBottom: ticket ? '40px' : '0', // Espacio si hay resultados
                transition: 'all 0.3s ease'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1a202c', marginBottom: '8px' }}>Estado de Reparación</h1> {/* Título oscuro */}
                    <p style={{ fontSize: '14px', color: '#4a5568' }}>Consulta el progreso de tu equipo</p> {/* Texto gris */}
                </div>

                <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
                    <div style={{
                        display: 'flex',
                        background: '#ffffff', // Fondo blanco para el input
                        border: `1px solid ${error ? '#ef4444' : '#cbd5e0'}`, // Borde gris claro
                        borderRadius: '12px',
                        padding: '4px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}>
                        <input
                            type="text"
                            value={ticketId}
                            onChange={(e) => { setTicketId(e.target.value); setError(''); }}
                            placeholder="Ingresa tu ID de Ticket (ej: 90287b37)"
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                padding: '0 16px',
                                color: '#1a202c', // Texto oscuro en input
                                outline: 'none',
                                fontSize: '14px',
                                fontFamily: 'monospace'
                            }}
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                background: loading ? '#a0aec0' : '#3b82f6', // Azul para el botón
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '10px 20px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: loading ? 'wait' : 'pointer',
                                transition: 'background 0.2s'
                            }}
                        >
                            {loading ? '...' : 'Buscar'}
                        </button>
                    </div>
                    {error && (
                        <p style={{ position: 'absolute', top: '100%', left: '4px', marginTop: '8px', color: '#ef4444', fontSize: '12px' }}>
                            {error}
                        </p>
                    )}
                </form>

                {/* Ejemplos (Solo si no hay ticket visible para no ensuciar) */}
                {!ticket && (
                    <div style={{ marginTop: '32px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button onClick={() => setTicketId('5f8320f6')} style={{ background: '#ffffff', border: '1px solid #cbd5e0', color: '#4a5568', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer' }}>Demo Laptop</button>
                        <button onClick={() => setTicketId('47d8cd53')} style={{ background: '#ffffff', border: '1px solid #cbd5e0', color: '#4a5568', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer' }}>Demo TV</button>
                    </div>
                )}
            </div>

            {/* Resultado (Card) */}
            {ticket && (
                <div style={{ width: '100%', maxWidth: '800px', animation: 'fadeIn 0.5s ease' }}>
                    {/* Nota: La TicketStatusCard tiene su propio modo oscuro. Aquí se mezcla. */}
                    <TicketStatusCard ticket={ticket} />
                </div>
            )}

            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
