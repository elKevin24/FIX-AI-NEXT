'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Input, Button } from '@/components/ui';
import { searchTicket } from '@/lib/actions';
import TicketStatusCard from '@/components/tickets/TicketStatusCard';

export default function TicketSearchPage() {
    const [ticketId, setTicketId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [ticket, setTicket] = useState<any | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticketId.trim()) {
            setError('Por favor, ingresa un ID de ticket.');
            return;
        }

        setLoading(true);
        setError('');
        setTicket(null);

        try {
            const result = await searchTicket(ticketId.trim());
            if (result) {
                setTicket(result);
            } else {
                setError('No se encontró ningún ticket con ese ID. Verifique e intente nuevamente.');
            }
        } catch (err) {
            console.error("Error al consultar el ticket:", err);
            setError('Ocurrió un error al consultar el ticket. Intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    // Quick access example IDs
    const exampleIds = [
        { short: '90287b37', label: 'Reparación Laptop' },
        { short: '6b40d86d', label: 'Problema Impresora' },
    ];

    const handleExampleClick = (id: string) => {
        setTicketId(id);
        setError(''); // Clear error when selecting example
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-secondary-50) 100%)',
            position: 'relative',
            paddingTop: 'var(--spacing-8)',
            paddingBottom: 'var(--spacing-4)',
            paddingLeft: 'var(--spacing-4)',
            paddingRight: 'var(--spacing-4)',
        }}>
            {/* Botón de Home - Posicionado absolutamente */}
            <Link
                href="/"
                className="btn btn-glass btn-sm"
                style={{
                    position: 'absolute',
                    top: 'var(--spacing-8)',
                    left: 'var(--spacing-8)',
                    zIndex: 10
                }}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span>Inicio</span>
            </Link>

            {/* Contenedor central de la card */}
            <div style={{
                width: '100%',
                maxWidth: ticket ? '900px' : '600px',
                transition: 'max-width 0.3s ease-out',
                margin: '0 auto'
            }}>
                    {/* Main Card (Search Form & Results) */}
                    <Card
                    style={{
                        background: 'white',
                        border: 'none',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                    }}
                    onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                    }}
                >
                    {/* Header with icon */}
                    <div style={{
                        textAlign: 'center',
                        paddingTop: 'var(--spacing-8)',
                        paddingBottom: 'var(--spacing-6)'
                    }}>
                        {/* Icon - Minimal & Clean */}
                        <div style={{
                            width: '48px',
                            height: '48px',
                            margin: '0 auto var(--spacing-4)',
                            background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600))',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px -2px var(--color-primary-300)'
                        }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
                                <path d="m12 12 4 10 1.7-4.3L22 16Z" />
                            </svg>
                        </div>

                        <CardHeader style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 'var(--spacing-2)' }}>
                            <h1 style={{
                                fontSize: 'var(--font-size-2xl)',
                                fontWeight: '700',
                                color: 'var(--color-gray-900)',
                                letterSpacing: '-0.02em',
                                lineHeight: '1.2'
                            }}>
                                Consulta tu Ticket
                            </h1>
                        </CardHeader>
                        <p style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-gray-600)',
                            maxWidth: '340px',
                            margin: '0 auto',
                            lineHeight: '1.5',
                            fontWeight: '400'
                        }}>
                            Ingresa el ID de tu servicio para ver el estado
                        </p>
                    </div>

                    <CardBody style={{ padding: '0 var(--spacing-8) var(--spacing-8)' }}>
                        {/* Search Form */}
                        <form onSubmit={handleSubmit} style={{ marginBottom: 'var(--spacing-6)' }}>
                            <div style={{ marginBottom: 'var(--spacing-5)' }}>
                                <Input
                                    label="ID del Ticket"
                                    type="text"
                                    value={ticketId}
                                    onChange={(e) => {
                                        setTicketId(e.target.value);
                                        setError('');
                                    }}
                                    placeholder="90287b37"
                                    required
                                    style={{
                                        fontSize: 'var(--font-size-base)',
                                        padding: 'var(--spacing-3)',
                                        letterSpacing: '0.02em',
                                        fontFamily: 'var(--font-family-mono)',
                                        borderColor: error ? 'var(--color-error-500)' : 'var(--color-gray-300)',
                                        height: '48px'
                                    }}
                                />
                                {error && (
                                    <p style={{
                                        color: 'var(--color-error-600)',
                                        fontSize: 'var(--font-size-sm)',
                                        marginTop: 'var(--spacing-2)',
                                        fontWeight: '500'
                                    }}>
                                        {error}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                fullWidth
                                disabled={loading}
                                style={{
                                    height: '48px',
                                    fontSize: 'var(--font-size-base)',
                                    fontWeight: '600',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                                }}
                            >
                                {loading ? (
                                    <span>Buscando...</span>
                                ) : (
                                    <>
                                        <span>Consultar Estado</span>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '8px' }}>
                                            <path d="M5 12h14m-7-7l7 7-7 7" />
                                        </svg>
                                    </>
                                )}
                            </Button>
                        </form>

                        {/* TODO: Eliminar ejemplos */}
                        {/* Quick Access Examples - Chips Style */}
                        <div style={{
                            borderTop: '1px solid var(--color-gray-200)',
                            paddingTop: 'var(--spacing-5)',
                            marginBottom: 'var(--spacing-5)'
                        }}>
                            <p style={{
                                fontSize: 'var(--font-size-xs)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                color: 'var(--color-gray-500)',
                                marginBottom: 'var(--spacing-3)',
                                fontWeight: '600',
                                textAlign: 'center'
                            }}>
                                Ejemplos
                            </p>
                            <div style={{
                                display: 'flex',
                                gap: 'var(--spacing-2)',
                                justifyContent: 'center',
                                flexWrap: 'wrap'
                            }}>
                                {exampleIds.map((example) => (
                                    <button
                                        key={example.short}
                                        type="button"
                                        onClick={() => handleExampleClick(example.short)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--spacing-2)',
                                            padding: 'var(--spacing-2) var(--spacing-3)',
                                            background: 'var(--color-gray-50)',
                                            border: '1px solid var(--color-gray-200)',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--color-gray-700)',
                                            fontWeight: '500'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--color-primary-300)';
                                            e.currentTarget.style.color = 'var(--color-primary-700)';
                                            e.currentTarget.style.background = 'var(--color-primary-50)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--color-gray-200)';
                                            e.currentTarget.style.color = 'var(--color-gray-700)';
                                            e.currentTarget.style.background = 'var(--color-gray-50)';
                                        }}
                                    >
                                        <span>{example.label}</span>
                                        <span style={{
                                            fontFamily: 'monospace',
                                            background: 'white',
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            fontSize: '0.85em',
                                            color: 'var(--color-gray-600)',
                                            border: '1px solid var(--color-gray-200)'
                                        }}>{example.short}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Help section - Subtle */}
                        <div style={{
                            padding: 'var(--spacing-4)',
                            background: 'var(--color-info-50)',
                            borderRadius: '10px',
                            display: 'flex',
                            gap: 'var(--spacing-3)',
                            alignItems: 'flex-start',
                            border: '1px solid var(--color-info-100)'
                        }}>
                            <div style={{
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--color-info-600)',
                                flexShrink: 0,
                                marginTop: '2px'
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 16v-4m0-4h.01" />
                                </svg>
                            </div>
                            <p style={{
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-gray-700)',
                                margin: 0,
                                lineHeight: '1.5'
                            }}>
                                Tu ID está en el recibo de ingreso o en el correo de confirmación.
                            </p>
                        </div>
                    </CardBody>
                </Card>

                {/* Ticket Details Card (conditionally rendered below form) */}
                {ticket && (
                    <div style={{
                        marginTop: 'var(--spacing-6)'
                    }}>
                        <TicketStatusCard ticket={ticket} />
                    </div>
                )}
            </div>
        </div>
    );
}
