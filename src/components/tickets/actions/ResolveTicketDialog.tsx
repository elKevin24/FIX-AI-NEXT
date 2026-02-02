'use client';

import React, { useEffect } from 'react';
import { useActionState } from 'react';
import { updateTicketStatus } from '@/lib/actions';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import styles from './TicketDialogs.module.css';

interface ResolveTicketDialogProps {
  ticketId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ResolveTicketDialog({ ticketId, isOpen, onClose, onSuccess }: ResolveTicketDialogProps) {
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
      title="Resolver Ticket"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button 
            variant="success" 
            type="submit" 
            form="resolve-ticket-form" 
            isLoading={isPending}
          >
            Marcar como Resuelto
          </Button>
        </>
      }
    >
      <form id="resolve-ticket-form" action={action} className={styles.form}>
        <input type="hidden" name="ticketId" value={ticketId} />
        <input type="hidden" name="status" value="RESOLVED" />
        
        <p className={styles.description}>
          Confirma que el trabajo ha sido completado exitosamente. Esto notificará al cliente para que pueda retirar su equipo.
        </p>

        <div className={styles.fieldGroup}>
          <label htmlFor="resolve-note" className={styles.label}>
            Informe de Resolución *
          </label>
          <textarea
            id="resolve-note"
            name="note"
            className={styles.textarea}
            placeholder="Describe brevemente el trabajo realizado y el resultado final..."
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
