"use client";

import React, { useEffect, useActionState, useState } from "react";
import { updateTicketStatus } from "@/lib/actions";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import styles from "./TicketDialogs.module.css";

interface ReopenTicketDialogProps {
  ticketId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReopenTicketDialog({ ticketId, isOpen, onClose, onSuccess }: ReopenTicketDialogProps) {
  const [state, action, isPending] = useActionState(updateTicketStatus, null);
  const [reason, setReason] = useState("");

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
      title="Reabrir Ticket"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            type="submit" 
            form="reopen-ticket-form" 
            isLoading={isPending}
          >
            Reabrir Caso
          </Button>
        </>
      }
    >
      <form id="reopen-ticket-form" action={action} className={styles["form"]}>
        <input type="hidden" name="ticketId" value={ticketId} />
        <input type="hidden" name="status" value="IN_PROGRESS" />

        <div className={styles["fieldGroup"]}>
          <label htmlFor="reopen-reason" className={styles["label"]}>
            Motivo de reapertura
          </label>
          <textarea
            id="reopen-reason"
            name="note"
            className={styles["textarea"]}
            placeholder="Ej: Falla recurrente, garantía o revisión solicitada por el cliente..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            autoFocus
          />
        </div>

        {state?.message && !state.success && (
          <div className={styles["errorBox"]}>
            {state.message}
          </div>
        )}
      </form>
    </Modal>
  );
}

