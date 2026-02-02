'use client';

import React, { useEffect } from 'react';
import { useActionState } from 'react';
import { updateTicketStatus } from '@/lib/actions';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import styles from './TicketDialogs.module.css';

interface WaitForPartsDialogProps {
  ticketId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function WaitForPartsDialog({ ticketId, isOpen, onClose, onSuccess }: WaitForPartsDialogProps) {
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
      title="Pausar por Repuestos"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button 
            variant="warning" 
            type="submit" 
            form="wait-parts-form" 
            isLoading={isPending}
          >
            Pausar Ticket
          </Button>
        </>
      }
    >
      <form id="wait-parts-form" action={action} className={styles.form}>
        <input type="hidden" name="ticketId" value={ticketId} />
        <input type="hidden" name="status" value="WAITING_FOR_PARTS" />
        
        <p className={styles.description}>
          El ticket se pausará y el tiempo de SLA se detendrá hasta que se reanude el trabajo.
        </p>

        <div className={styles.fieldGroup}>
          <label htmlFor="parts-note" className={styles.label}>
            ¿Qué repuestos faltan? *
          </label>
          <textarea
            id="parts-note"
            name="note"
            className={styles.textarea}
            placeholder="Ej: Pantalla agotada, pedido a proveedor realizado..."
            required
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
