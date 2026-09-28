'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import styles from './ExportButton.module.css';

interface Props {
    type: 'tickets' | 'parts' | 'invoices' | 'pos-sales';
    className?: string;
}

export default function ExportButton({ type, className = '' }: Props) {
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const close = useCallback(() => setIsOpen(false), []);

    useEffect(() => {
        if (!isOpen) return;

        const onPointerDown = (event: MouseEvent | TouchEvent) => {
            if (!wrapperRef.current?.contains(event.target as Node)) {
                close();
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                close();
                wrapperRef.current?.querySelector('button')?.focus();
            }
        };

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('touchstart', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('touchstart', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isOpen, close]);

    const handleExport = async (format: string) => {
        close();
        setLoading(true);
        try {
            const url = `/api/export/${type}?format=${format}`;
            const link = document.createElement('a');
            link.href = url;
            link.download = '';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error(e);
        } finally {
            setTimeout(() => setLoading(false), 1000);
        }
    };

    return (
        <div
            ref={wrapperRef}
            className={`${styles['wrapper']} ${className}`}
            data-open={isOpen || undefined}
        >
            <Button
                variant="secondary"
                disabled={loading}
                isLoading={loading}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((open) => !open)}
            >
                📥 Exportar
            </Button>
            <div className={styles['dropdown']} role="menu">
                <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleExport('xlsx')}
                    className={styles['dropdownItem']}
                >
                    Excel (.xlsx)
                </button>
                <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleExport('csv')}
                    className={styles['dropdownItem']}
                >
                    CSV (.csv)
                </button>
            </div>
        </div>
    );
}
