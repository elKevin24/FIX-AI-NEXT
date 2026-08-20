'use client';

import { useState } from 'react';
import { useToast } from '@/context/ToastContext';

interface Props {
  url: string;
  filename: string;
  label?: string;
  className?: string;
}

export default function CsvExportButton({ url, filename, label = '📥 Exportar CSV', className = '' }: Props) {
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleExport = async () => {
    setLoading(true);
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      addToast('Error al exportar', 'ERROR');
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className={className}
      style={{
        padding: '0.5rem 1rem',
        backgroundColor: 'white',
        border: '1px solid var(--color-border)',
        borderRadius: '6px',
        cursor: loading ? 'wait' : 'pointer',
        fontWeight: 500,
        fontSize: '0.875rem',
        color: 'var(--color-text-primary)',
        opacity: loading ? 0.7 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      {loading ? 'Exportando...' : label}
    </button>
  );
}
