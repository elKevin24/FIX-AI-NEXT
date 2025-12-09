'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Input, Button } from '@/components/ui';

export default function TicketSearchPage() {
    const [ticketId, setTicketId] = useState('');
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (ticketId.trim()) {
            router.push(`/tickets/status/${ticketId.trim()}`);
        }
    };

    // Quick access example IDs
    const exampleIds = [
        { short: '90287b37', label: 'Reparación Laptop' },
        { short: '6b40d86d', label: 'Problema Impresora' },
    ];

    const handleExampleClick = (id: string) => {
        setTicketId(id);
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-secondary-50) 100%)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: 'var(--spacing-4)',
            paddingTop: 'var(--spacing-20)'
        }}>
            <div style={{ width: '100%', maxWidth: '600px', position: 'relative' }}>
                {/* Back to Home - Floating button style */}
                <div style={{
                    position: 'absolute',
                    top: 'var(--spacing-4)',
                    left: 'calc(100% + var(--spacing-4))'
                }}>
                    <Link
                        href="/"
                        className="btn btn-glass btn-sm"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        <span>Inicio</span>
                    </Link>
                </div>

                {/* Main Card */}
                <Card
                    style={{ background: 'white', border: 'none' }}
                    onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-xl)';
                    }}
                    onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }}
                >
                    {/* Header with icon */}
                    <div style={{
                        textAlign: 'center',
                        paddingTop: 'var(--spacing-8)',
                        paddingBottom: 'var(--spacing-6)'
                    }}>
                        {/* Icon - Circular & Glowing */}
                        <div style={{
                            width: '72px',
                            height: '72px',
                            margin: '0 auto var(--spacing-6)',
                            background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600))',
                            borderRadius: '50%', // Circular
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 10px 25px -5px var(--color-primary-200)' // Colored shadow
                        }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
                                <path d="m12 12 4 10 1.7-4.3L22 16Z" />
                            </svg>
                        </div>

                        <CardHeader style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 'var(--spacing-3)' }}>
                            <h1 style={{ 
                                fontSize: 'var(--font-size-2xl)', 
                                fontWeight: '800', 
                                color: 'var(--color-gray-900)',
                                letterSpacing: '-0.03em'
                            }}>
                                Consulta tu Ticket
                            </h1>
                        </CardHeader>
                        <p style={{
                            fontSize: 'var(--font-size-base)',
                            color: 'var(--color-gray-600)',
                            maxWidth: '420px',
                            margin: '0 auto',
                            lineHeight: '1.6'
                        }}>
                            Ingresa el ID de tu servicio para ver el estado en tiempo real.
                        </p>
                    </div>

                    <CardBody style={{ padding: '0 var(--spacing-2)' }}>
                        <form onSubmit={handleSubmit} style={{ marginBottom: 'var(--spacing-8)' }}>
                            <div style={{ marginBottom: 'var(--spacing-6)' }}>
                                <Input
                                    label="ID del Ticket"
                                    type="text"
                                    value={ticketId}
                                    onChange={(e) => setTicketId(e.target.value)}
                                    placeholder="Ej: 90287b37"
                                    required
                                    style={{ 
                                        fontSize: 'var(--font-size-lg)', 
                                        padding: 'var(--spacing-4)',
                                        letterSpacing: '0.05em',
                                        fontFamily: 'var(--font-family-mono)'
                                    }}
                                />
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                fullWidth
                                style={{
                                    height: '54px',
                                    fontSize: 'var(--font-size-base)',
                                    fontWeight: '600',
                                    borderRadius: 'var(--radius-full)', // Pill button
                                    boxShadow: '0 4px 12px var(--color-primary-200)'
                                }}
                            >
                                <span>Consultar Estado</span>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: '8px' }}>
                                    <path d="M5 12h14m-7-7l7 7-7 7" />
                                </svg>
                            </Button>
                        </form>

                        {/* Quick Access Examples - Chips Style */}
                        <div style={{
                            borderTop: '1px solid var(--color-gray-100)',
                            paddingTop: 'var(--spacing-6)',
                            marginBottom: 'var(--spacing-6)'
                        }}>
                            <p style={{
                                fontSize: 'var(--font-size-xs)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: 'var(--color-gray-500)',
                                marginBottom: 'var(--spacing-4)',
                                fontWeight: '600',
                                textAlign: 'center'
                            }}>
                                Probar con ejemplos
                            </p>
                            <div style={{
                                display: 'flex',
                                gap: 'var(--spacing-3)',
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
                                            padding: 'var(--spacing-2) var(--spacing-4)',
                                            background: 'white',
                                            border: '1px solid var(--color-gray-200)',
                                            borderRadius: '9999px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--color-gray-700)'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--color-primary-400)';
                                            e.currentTarget.style.color = 'var(--color-primary-700)';
                                            e.currentTarget.style.background = 'var(--color-primary-50)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--color-gray-200)';
                                            e.currentTarget.style.color = 'var(--color-gray-700)';
                                            e.currentTarget.style.background = 'white';
                                        }}
                                    >
                                        <span>{example.label}</span>
                                        <span style={{
                                            fontFamily: 'monospace',
                                            background: 'var(--color-gray-100)',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontSize: '0.8em',
                                            color: 'var(--color-gray-600)'
                                        }}>{example.short}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Help section - Subtle */}
                        <div style={{
                            padding: 'var(--spacing-4)',
                            background: 'var(--color-gray-50)',
                            borderRadius: 'var(--radius-lg)',
                            display: 'flex',
                            gap: 'var(--spacing-3)',
                            alignItems: 'center'
                        }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--color-info-600)',
                                boxShadow: 'var(--shadow-sm)',
                                flexShrink: 0
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M12 16v-4m0-4h.01" />
                                    <circle cx="12" cy="12" r="10" />
                                </svg>
                            </div>
                            <p style={{
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-gray-600)',
                                margin: 0,
                                lineHeight: '1.4'
                            }}>
                                <span style={{ fontWeight: '600', color: 'var(--color-gray-800)' }}>¿Ayuda?</span> Tu ID está en el recibo de ingreso o en el correo de confirmación.
                            </p>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
