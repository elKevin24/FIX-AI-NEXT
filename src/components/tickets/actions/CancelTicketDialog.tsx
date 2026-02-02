'use client';

import React, { useEffect } from 'react';
import { useActionState } from 'react';
import { updateTicketStatus } from '@/lib/actions';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import styles from './TicketDialogs.module.css';

interface CancelTicketDialogProps {
  ticketId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CancelTicketDialog({ ticketId, isOpen, onClose, onSuccess }: CancelTicketDialogProps) {
  const [state, action, isPending] = useActionState(updateTicketStatus, null);

  useEffect(() => {
    if (state?.success) {
      onSuccess?.();
      onClose();
    }
  }, [state, onClose, onSuccess]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancelar Servicio"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Volver
          </Button>
          <Button 
            variant="danger" 
            type="submit" 
            form="cancel-ticket-form" 
            isLoading={isPending}
          >
            Confirmar Cancelación
          </Button>
        </>
      }
    >
      <form id="cancel-ticket-form" action={action} className={styles.form}>
        <input type="hidden" name="ticketId" value={ticketId} />
        <input type="hidden" name="status" value="CANCELLED" />
        
        <div className={styles.warningBox}>
          <p className={styles.warningText}>
            ⚠️ Advertencia: Al cancelar este ticket, cualquier repuesto asignado y no utilizado será devuelto automáticamente al inventario.
          </p>
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="cancel-reason" className={styles.label}>
            Motivo de la cancelación *
          </label>
          <textarea
            id="cancel-reason"
            name="note"
            className={styles.textarea}
            placeholder="Ej: Cliente rechazó el presupuesto / Equipo irreparable..."
            required
            autoFocus
          />
        </div>

        {state?.message && !state.success && (
          <div className={styles.errorBox}>
            {state.message}
          </div>
        )}
      </form>
    </Modal>
  );
}
