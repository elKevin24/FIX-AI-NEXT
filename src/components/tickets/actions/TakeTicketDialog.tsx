"use client";

import React, { useEffect, useActionState } from "react";
import { updateTicketStatus } from "@/lib/actions";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import styles from "./TicketDialogs.module.css";

interface TakeTicketDialogProps {
  ticketId: string;
  ticketTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TakeTicketDialog({ ticketId, ticketTitle, isOpen, onClose, onSuccess }: TakeTicketDialogProps) {
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
      title="Tomar Ticket para Reparación"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            type="submit" 
            form="take-ticket-form" 
            isLoading={isPending}
          >
            Confirmar y Autoasignar
          </Button>
        </>
      }
    >
      <form id="take-ticket-form" action={action} className={styles["form"]}>
        <input type="hidden" name="ticketId" value={ticketId} />
        <input type="hidden" name="status" value="IN_PROGRESS" />
        <input type="hidden" name="note" value="Ticket tomado por el técnico para iniciar diagnóstico/reparación" />

        <p style={{ margin: "0 0 1rem 0", color: "var(--color-text-secondary)", fontSize: "0.95rem" }}>
          ¿Deseas autoasignarte el ticket <strong>{ticketTitle}</strong> e iniciar el trabajo?
        </p>

        {state?.message && !state.success && (
          <div className={styles["errorBox"]}>
            {state.message}
          </div>
        )}
      </form>
    </Modal>
  );
}

