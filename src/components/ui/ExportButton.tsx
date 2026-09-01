'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui';
import styles from './ExportButton.module.css';

interface Props {
    type: 'tickets' | 'parts' | 'invoices' | 'pos-sales';
    className?: string;
}

export default function ExportButton({ type, className = '' }: Props) {
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Handle Escape key
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const handleExport = async (format: string) => {
        setLoading(true);
        setIsOpen(false);
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
        <div className={`${styles['wrapper']} ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
            <Button 
                variant="secondary" 
                disabled={loading} 
                isLoading={loading}
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label="Exportar datos"
                type="button"
            >
                <span aria-hidden="true">📥</span> Exportar
            </Button>
            {isOpen && (
                <div className={styles['dropdown']} role="menu" aria-label="Formatos de exportación">
                    <button
                        type="button"
                        onClick={() => handleExport('xlsx')}
                        className={styles['dropdownItem']}
                        role="menuitem"
                    >
                        Excel (.xlsx)
                    </button>
                    <button
                        type="button"
                        onClick={() => handleExport('csv')}
                        className={styles['dropdownItem']}
                        role="menuitem"
                    >
                        CSV (.csv)
                    </button>
                </div>
            )}
        </div>
    );
}
