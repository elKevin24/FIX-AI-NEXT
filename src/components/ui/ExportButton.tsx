'use client';
import { useState } from 'react';
import { Button } from '@/components/ui';
import styles from './ExportButton.module.css';

interface Props {
    type: 'tickets' | 'parts' | 'invoices' | 'pos-sales';
    className?: string;
}

export default function ExportButton({ type, className = '' }: Props) {
    const [loading, setLoading] = useState(false);

    const handleExport = async (format: string) => {
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
        <div className={`${styles['wrapper']} ${className}`}>
            <Button variant="secondary" disabled={loading} isLoading={loading}>
                📥 Exportar
            </Button>
            <div className={styles['dropdown']}>
                <button
                    onClick={() => handleExport('xlsx')}
                    className={styles['dropdownItem']}
                >
                    Excel (.xlsx)
                </button>
                <button
                    onClick={() => handleExport('csv')}
                    className={styles['dropdownItem']}
                >
                    CSV (.csv)
                </button>
            </div>
        </div>
    );
}
