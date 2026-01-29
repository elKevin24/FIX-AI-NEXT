
'use client';

import { useTransition } from 'react';
import { bulkUpdateTicketStatus, bulkDeleteTickets } from '@/lib/bulk-actions';

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
        <>
            <select 
                onChange={(e) => {
                    if (e.target.value) handleStatusUpdate(e.target.value);
                    e.target.value = '';
                }}
                disabled={isPending}
                className="px-2 py-1 border rounded text-sm"
            >
                <option value="">Cambiar Estado...</option>
                <option value="OPEN">Abierto</option>
                <option value="IN_PROGRESS">En Progreso</option>
                <option value="WAITING_FOR_PARTS">Esperando Repuestos</option>
                <option value="RESOLVED">Resuelto</option>
                <option value="CLOSED">Cerrado</option>
            </select>

            {isAdmin && (
                <button 
                    disabled={isPending} 
                    onClick={handleDelete} 
                    className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium"
                >
                    Eliminar
                </button>
            )}
        </>
    );
}
