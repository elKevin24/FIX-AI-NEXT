
'use client';

import { useTransition } from 'react';
import { bulkUpdateTicketStatus, bulkDeleteTickets } from '@/lib/bulk-actions';
import { Button } from '@/components/ui/Button';

interface Props {
    selectedTickets: any[];
    onSuccess?: () => void;
    isAdmin?: boolean;
}

export default function BulkActionsToolbar({ selectedTickets, onSuccess, isAdmin }: Props) {
    const [isPending, startTransition] = useTransition();

    const handleStatusUpdate = (status: string) => {
        if (!confirm(`¿Actualizar estado de ${selectedTickets.length} tickets a ${status}?`)) return;
        
        startTransition(async () => {
             const ids = selectedTickets.map(t => t.id);
             await bulkUpdateTicketStatus(ids, status as any);
             onSuccess?.();
        });
    };

    const handleDelete = () => {
        if (!confirm(`¿Eliminar ${selectedTickets.length} tickets? Esta acción no se puede deshacer.`)) return;

        startTransition(async () => {
             const ids = selectedTickets.map(t => t.id);
             await bulkDeleteTickets(ids);
             onSuccess?.();
        });
    };

    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <select 
                onChange={(e) => {
                    if (e.target.value) handleStatusUpdate(e.target.value);
                    e.target.value = '';
                }}
                disabled={isPending}
                style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: 'var(--radius-base)',
                    border: '1px solid var(--color-border-medium)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-primary)'
                }}
            >
                <option value="">Cambiar Estado...</option>
                <option value="OPEN">Abierto</option>
                <option value="IN_PROGRESS">En Progreso</option>
                <option value="WAITING_FOR_PARTS">Esperando Repuestos</option>
                <option value="RESOLVED">Resuelto</option>
                <option value="CLOSED">Cerrado</option>
            </select>

            {isAdmin && (
                <Button 
                    disabled={isPending} 
                    isLoading={isPending}
                    onClick={handleDelete} 
                    variant="danger"
                    size="sm"
                >
                    Eliminar
                </Button>
            )}
        </div>
    );
}
