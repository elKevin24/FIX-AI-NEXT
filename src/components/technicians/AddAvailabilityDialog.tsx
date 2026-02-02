'use client';

import React from 'react';
import { useActionState } from 'react';
import { createUnavailability } from '@/lib/technician-actions';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

// Reuse existing form styles or create simple ones
const styles = {
    form: { display: 'flex', flexDirection: 'column' as const, gap: '1rem' },
    fieldGroup: { display: 'flex', flexDirection: 'column' as const, gap: '0.5rem' },
    label: { fontWeight: 600, fontSize: '0.875rem' },
    input: { padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' },
    select: { padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', backgroundColor: 'white' },
    textarea: { padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', minHeight: '80px' },
    errorBox: { backgroundColor: '#fef2f2', color: '#b91c1c', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem' },
};

interface AddAvailabilityDialogProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const REASON_OPTIONS = [
    { value: 'ON_VACATION', label: 'Vacaciones' },
    { value: 'SICK_LEAVE', label: 'Enfermedad' },
    { value: 'ON_LEAVE', label: 'Permiso Personal' },
    { value: 'IN_TRAINING', label: 'Capacitación' },
    { value: 'UNAVAILABLE', label: 'No Disponible (Otro)' },
];

export function AddAvailabilityDialog({ userId, isOpen, onClose, onSuccess }: AddAvailabilityDialogProps) {
  const [state, action, isPending] = useActionState(createUnavailability, null);

  // Close on success
  React.useEffect(() => {
    if (state?.success) {
      onSuccess?.();
      onClose();
    }
  }, [state, onClose, onSuccess]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Ausencia"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            type="submit" 
            form="add-availability-form" 
            isLoading={isPending}
          >
            Guardar
          </Button>
        </>
      }
    >
      <form id="add-availability-form" action={action} style={styles.form}>
        <input type="hidden" name="userId" value={userId} />
        
        <div style={styles.fieldGroup}>
            <label htmlFor="reason" style={styles.label}>Motivo *</label>
            <select name="reason" id="reason" style={styles.select} required defaultValue="">
                <option value="" disabled>Seleccione un motivo...</option>
                {REASON_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={styles.fieldGroup}>
                <label htmlFor="startDate" style={styles.label}>Desde *</label>
                <input type="date" name="startDate" id="startDate" style={styles.input} required />
            </div>
            <div style={styles.fieldGroup}>
                <label htmlFor="endDate" style={styles.label}>Hasta *</label>
                <input type="date" name="endDate" id="endDate" style={styles.input} required />
            </div>
        </div>

        <div style={styles.fieldGroup}>
            <label htmlFor="notes" style={styles.label}>Notas adicionales</label>
            <textarea name="notes" id="notes" style={styles.textarea} placeholder="Detalles opcionales..."></textarea>
        </div>

        {state?.message && !state.success && (
          <div style={styles.errorBox}>
            {state.message}
            {state.errors && (
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1rem' }}>
                    {Object.values(state.errors).flat().map((err: any, i) => (
                        <li key={i}>{err}</li>
                    ))}
                </ul>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
