'use client';

import { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Button } from './Button';

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
      addToast('Archivo exportado correctamente', 'SUCCESS');
    } catch (e) {
      console.error(e);
      addToast('Error al exportar', 'ERROR');
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      loading={loading}
      disabled={loading}
      className={className}
    >
      {loading ? 'Exportando...' : label}
    </Button>
  );
}
