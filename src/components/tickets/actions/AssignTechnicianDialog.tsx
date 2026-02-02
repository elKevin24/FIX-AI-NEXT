'use client';

import React, { useEffect } from 'react';
import { useActionState } from 'react';
import { updateTicket } from '@/lib/actions'; // Reuse updateTicket for assignment
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import styles from './TicketDialogs.module.css';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface AssignTechnicianDialogProps {
  ticketId: string;
  currentTitle: string; 
  currentDescription: string;
  currentStatus: string;
  currentPriority: string;
  users: User[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// NOTE: updateTicket requires title, description, status, priority, assignedToId
// We must preserve existing values while changing assignedToId
export function AssignTechnicianDialog({ 
  ticketId, 
  currentTitle,
  currentDescription,
  currentStatus,
  currentPriority,
  users, 
  isOpen, 
  onClose, 
  onSuccess 
}: AssignTechnicianDialogProps) {
  const [state, action, isPending] = useActionState(updateTicket, null);

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
      title="Asignar Técnico"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            type="submit" 
            form="assign-tech-form" 
            isLoading={isPending}
          >
            Asignar
          </Button>
        </>
      }
    >
      <form id="assign-tech-form" action={action} className={styles.form}>
        <input type="hidden" name="ticketId" value={ticketId} />
        {/* Hidden fields to preserve state */}
        <input type="hidden" name="title" value={currentTitle} />
        <input type="hidden" name="description" value={currentDescription} />
        <input type="hidden" name="status" value={currentStatus} />
        <input type="hidden" name="priority" value={currentPriority || ''} />

        <div className={styles.fieldGroup}>
          <label htmlFor="assignedToId" className={styles.label}>
            Seleccionar Técnico *
          </label>
          <select
            id="assignedToId"
            name="assignedToId"
            className={styles.select}
            required
            defaultValue=""
          >
            <option value="" disabled>Seleccione un técnico...</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || user.email} ({user.role === 'ADMIN' ? 'Admin' : 'Técnico'})
              </option>
            ))}
          </select>
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
