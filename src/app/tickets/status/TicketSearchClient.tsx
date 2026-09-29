'use client';

import { useState } from 'react';
import Link from 'next/link';
import { searchTicket } from '@/lib/actions';
import TicketStatusCard from '@/components/tickets/TicketStatusCard';
import ThemeSwitcher from '@/components/ui/ThemeSwitcher';
import styles from './status.module.css';

interface DemoTicket {
    id: string;
    title: string;
    deviceType: string | null;
}

interface TicketSearchClientProps {
    demoTickets?: DemoTicket[];
    initialTicket?: any;
    initialQuery?: string;
}

export default function TicketSearchClient({ 
    demoTickets = [],
    initialTicket = null,
    initialQuery = ''
}: TicketSearchClientProps) {
    const [ticketId, setTicketId] = useState(initialQuery);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(initialQuery && !initialTicket ? 'ID o código de ticket no encontrado.' : '');
    const [ticket, setTicket] = useState<any | null>(initialTicket);

    const performSearch = async (query: string) => {
        const cleanQuery = query.trim();
        if (!cleanQuery) return;

        setLoading(true);
        setError('');
        setTicket(null);

        try {
            const result = await searchTicket(cleanQuery);
            if (result) {
                setTicket(result);
            } else {
                setError('ID o código de ticket no encontrado.');
            }
        } catch (err) {
            console.error(err);
            setError('Error de conexión.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await performSearch(ticketId);
    };

    return (
        <>
            <div className={styles['backdrop']}></div>
            <div className={ticket ? styles['pageContainerCompact'] : styles['pageContainer']}>
                {/* Navbar Simple */}
                <nav className={styles['navbar']}>
                    <div className={styles['logo']}>
                        <div className={styles['logoSquare']}></div>
                        FIX-AI
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <ThemeSwitcher />
                        <Link href="/" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '0.875rem' }}>
                            Inicio
                        </Link>
                    </div>
                </nav>

                {/* Buscador Compacto */}
                <div className={styles['searchBox']}>
                    <div className={styles['searchHeader']}>
                        <h1 className={styles['searchTitle']}>
                            Estado de Reparación
                        </h1>
                        <p className={styles['searchSubtitle']}>
                            Consulta el progreso de tu equipo
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
                        <div className={`${styles['searchContainer']} ${error ? styles['searchContainerError'] : ''}`}>
                            <input
                                type="text"
                                value={ticketId}
                                onChange={(e) => { setTicketId(e.target.value); setError(''); }}
                                placeholder="Ingresa tu ID de Ticket (ej: 90287b37)"
                                className={styles['searchInput']}
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className={styles['searchButton']}
                            >
                                {loading ? '...' : 'Buscar'}
                            </button>
                        </div>
                        {error && (
                            <p className={styles['errorMessage']}>
                                {error}
                            </p>
                        )}
                    </form>

                    {/* Ejemplos Dinámicos */}
                    {!ticket && demoTickets.length > 0 && (
                        <div className={styles['demoContainer']}>
                            {demoTickets.map((demo) => (
                                <button
                                    key={demo.id}
                                    onClick={() => {
                                        const id = demo.id.slice(0, 8);
                                        setTicketId(id);
                                        performSearch(id);
                                    }}
                                    className={styles['demoButton']}
                                >
                                    Demo {demo.deviceType || 'Equipo'} ({demo.title})
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Resultado (Card) */}
                {ticket && (
                    <div className={styles['resultContainer']}>
                        <TicketStatusCard ticket={ticket} />
                    </div>
                )}
            </div>
        </>
    );
}