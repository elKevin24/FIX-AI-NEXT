'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { publicCustomerApproval } from '@/lib/actions';
import { Badge, BrandLogo } from '@/components/ui';
import styles from './approval.module.css';

interface ApprovalResult {
    success: boolean;
    message: string;
    newStatus?: string;
}

function parseAction(value: string | null): 'APPROVE' | 'REJECT' {
    return value === 'reject' ? 'REJECT' : 'APPROVE';
}

export default function ApprovalHandler() {
    const searchParams = useSearchParams();
    const ticketId = searchParams.get('ticketId') ?? '';
    const token = searchParams.get('token') ?? '';
    const action = parseAction(searchParams.get('action'));

    const isMissingParams = !ticketId || !token;
    const [loading, setLoading] = useState(!isMissingParams);
    const [result, setResult] = useState<ApprovalResult | null>(
        isMissingParams ? {
            success: false,
            message: 'Enlace inválido o incompleto. Revisa tu correo y vuelve a intentarlo.',
        } : null
    );
    const started = useRef(false);

    useEffect(() => {
        if (isMissingParams || started.current) return;

        started.current = true;
        let cancelled = false;

        (async () => {
            const res = await publicCustomerApproval(ticketId, token, action);
            if (!cancelled) {
                setResult({
                    success: res.success,
                    message: res.message,
                    newStatus: res.newStatus || undefined,
                });
                setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [ticketId, token, action, isMissingParams]);

    return (
        <main id="main-content" className={styles['page']}>
            <header className={styles['nav']}>
                <Link href="/" className={styles['brandLink']} aria-label="FIX Workshop - Inicio">
                    <BrandLogo size="md" theme="dark" />
                </Link>
            </header>

            <section className={styles['content']} aria-live="polite">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading-card"
                            className={styles['card']}
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className={styles['spinner']} aria-hidden="true" />
                            <p className={styles['loadingText']}>Procesando tu decisión...</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="result-card"
                            className={styles['card']}
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <Badge variant={result?.success ? 'success' : 'error'} className={styles['statusBadge']}>
                                {result?.success
                                    ? action === 'APPROVE'
                                        ? 'Presupuesto aprobado'
                                        : 'Presupuesto rechazado'
                                    : 'No se pudo procesar'}
                            </Badge>

                            <h1 className={styles['title']}>
                                {result?.success
                                    ? action === 'APPROVE'
                                        ? 'Gracias por aprobar el presupuesto'
                                        : 'Presupuesto rechazado'
                                    : 'Algo salió mal'}
                            </h1>
                            <p className={styles['message']}>{result?.message}</p>

                            <div className={styles['actions']}>
                                <Link href="/tickets/status" className={styles['primaryLink']}>
                                    Consultar otro ticket
                                </Link>
                                <Link href="/" className={styles['secondaryLink']}>
                                    Volver al inicio
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>
        </main>
    );
}