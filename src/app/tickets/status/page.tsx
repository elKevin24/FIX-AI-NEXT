'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardBody, Input, Button } from '@/components/ui';

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
        { short: '90287b37', label: 'Laptop Repair' },
        { short: '6b40d86d', label: 'Printer Issue' },
    ];

    const handleExampleClick = (id: string) => {
        setTicketId(id);
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-secondary-50) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--spacing-4)'
        }}>
            <div style={{ width: '100%', maxWidth: '600px' }}>
                {/* Back to Home - Floating button style */}
                <div style={{
                    marginBottom: 'var(--spacing-6)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Link
                        href="/"
                        className="btn btn-glass"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        <span>Home</span>
                    </Link>
                </div>

                {/* Main Card */}
                <Card>
                    {/* Header with icon */}
                    <div style={{
                        textAlign: 'center',
                        paddingTop: 'var(--spacing-8)',
                        paddingBottom: 'var(--spacing-4)'
                    }}>
                        {/* Icon */}
                        <div style={{
                            width: '80px',
                            height: '80px',
                            margin: '0 auto var(--spacing-4)',
                            background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-secondary-500))',
                            borderRadius: 'var(--radius-2xl)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 10px 30px rgba(66, 99, 235, 0.3)'
                        }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                <path d="M9 12h6m-6 4h6" />
                            </svg>
                        </div>

                        <CardHeader>
                            <CardTitle style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--spacing-2)' }}>
                                Track Your Ticket
                            </CardTitle>
                        </CardHeader>
                        <p style={{
                            fontSize: 'var(--font-size-base)',
                            color: 'var(--color-text-secondary)',
                            maxWidth: '400px',
                            margin: '0 auto',
                            lineHeight: '1.6'
                        }}>
                            Enter your ticket ID below to view the current status and details of your service request
                        </p>
                    </div>

                    <CardBody>
                        <form onSubmit={handleSubmit} style={{ marginTop: 'var(--spacing-6)' }}>
                            <Input
                                label="Ticket ID"
                                type="text"
                                value={ticketId}
                                onChange={(e) => setTicketId(e.target.value)}
                                placeholder="90287b37"
                                helper="Enter the full ID or just the first 8 characters"
                                required
                                style={{ fontSize: 'var(--font-size-lg)' }}
                            />

                            <div style={{ marginTop: 'var(--spacing-6)' }}>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    fullWidth
                                    style={{
                                        height: '56px',
                                        fontSize: 'var(--font-size-base)',
                                        fontWeight: '600',
                                        gap: 'var(--spacing-2)'
                                    }}
                                >
                                    <span>Check Status</span>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14m-7-7l7 7-7 7" />
                                    </svg>
                                </Button>
                            </div>
                        </form>

                        {/* Quick Access Examples */}
                        <div style={{
                            marginTop: 'var(--spacing-8)',
                            paddingTop: 'var(--spacing-6)',
                            borderTop: '1px solid var(--color-border)'
                        }}>
                            <p style={{
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-text-secondary)',
                                marginBottom: 'var(--spacing-3)',
                                fontWeight: '500',
                                textAlign: 'center'
                            }}>
                                Try with an example
                            </p>
                            <div style={{
                                display: 'flex',
                                gap: 'var(--spacing-3)',
                                flexWrap: 'wrap'
                            }}>
                                {exampleIds.map((example) => (
                                    <button
                                        key={example.short}
                                        type="button"
                                        onClick={() => handleExampleClick(example.short)}
                                        style={{
                                            flex: '1',
                                            minWidth: '180px',
                                            padding: 'var(--spacing-3) var(--spacing-4)',
                                            background: 'var(--color-surface-hover)',
                                            border: '2px solid transparent',
                                            borderRadius: 'var(--radius-lg)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            textAlign: 'left'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                                            e.currentTarget.style.background = 'var(--color-primary-50)';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = 'transparent';
                                            e.currentTarget.style.background = 'var(--color-surface-hover)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        <div style={{
                                            fontSize: 'var(--font-size-xs)',
                                            color: 'var(--color-text-tertiary)',
                                            marginBottom: 'var(--spacing-1)'
                                        }}>
                                            {example.label}
                                        </div>
                                        <div style={{
                                            fontFamily: 'monospace',
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--color-primary-600)',
                                            fontWeight: '600'
                                        }}>
                                            {example.short}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Help section */}
                        <div style={{
                            marginTop: 'var(--spacing-6)',
                            padding: 'var(--spacing-4)',
                            background: 'var(--color-info-50)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--color-info-200)'
                        }}>
                            <div style={{ display: 'flex', gap: 'var(--spacing-3)', alignItems: 'flex-start' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-info-600)" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 16v-4m0-4h.01" />
                                </svg>
                                <div>
                                    <p style={{
                                        fontSize: 'var(--font-size-sm)',
                                        color: 'var(--color-info-700)',
                                        margin: 0,
                                        lineHeight: '1.5'
                                    }}>
                                        <strong>Where to find your Ticket ID?</strong><br/>
                                        Check your email confirmation or the receipt you received when submitting your service request.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
