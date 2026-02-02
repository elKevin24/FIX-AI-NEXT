'use client';

import React, { useState } from 'react';
import { useActionState } from 'react';
import { updateTicketStatus } from '@/lib/actions';
import { Button } from '@/components/ui/Button';
import { CancelTicketDialog } from './actions/CancelTicketDialog';
import { ResolveTicketDialog } from './actions/ResolveTicketDialog';
import { WaitForPartsDialog } from './actions/WaitForPartsDialog';
import { AssignTechnicianDialog } from './actions/AssignTechnicianDialog';
import styles from './TicketWorkflowActions.module.css';

interface User {
    id: string;
    name: string | null;
    email: string;
    role: string;
}

interface TicketWorkflowActionsProps {
    ticket: {
        id: string;
        title: string;
        description: string;
        status: string;
        priority: string | null;
        assignedTo?: { id: string; name: string | null } | null;
    };
    availableUsers: User[];
    isAdmin: boolean;
    currentUserId: string;
}

export default function TicketWorkflowActions({ ticket, availableUsers, isAdmin, currentUserId }: TicketWorkflowActionsProps) {
    // Dialog States
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [showResolveDialog, setShowResolveDialog] = useState(false);
    const [showWaitPartsDialog, setShowWaitPartsDialog] = useState(false);
    const [showAssignDialog, setShowAssignDialog] = useState(false);

    // Direct Actions (Start, Resume, Reopen, Close)
    const [, startAction, isStarting] = useActionState(updateTicketStatus, null);
    const [, resumeAction, isResuming] = useActionState(updateTicketStatus, null);
    const [, reopenAction, isReopening] = useActionState(updateTicketStatus, null);
    const [, closeAction, isClosing] = useActionState(updateTicketStatus, null);

    const isAssignedToMe = ticket.assignedTo?.id === currentUserId;
    const canAct = isAdmin || isAssignedToMe || ticket.status === 'OPEN'; // Open tickets can be grabbed

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'OPEN': return 'Abierto';
            case 'IN_PROGRESS': return 'En Progreso';
            case 'WAITING_FOR_PARTS': return 'Esperando Repuestos';
            case 'RESOLVED': return 'Resuelto';
            case 'CLOSED': return 'Cerrado';
            case 'CANCELLED': return 'Cancelado';
            default: return status;
        }
    };

    const statusClass = `status-${ticket.status.toLowerCase()}`;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Flujo de Trabajo</h3>
                <span className={`${styles.statusBadge} ${styles[statusClass]}`}>
                    {getStatusLabel(ticket.status)}
                </span>
            </div>

            <div className={styles.actionsGrid}>
                {/* OPEN Actions */}
                {ticket.status === 'OPEN' && (
                    <>
                        <form action={startAction}>
                            <input type="hidden" name="ticketId" value={ticket.id} />
                            <input type="hidden" name="status" value="IN_PROGRESS" />
                            <input type="hidden" name="note" value="Inicio de reparación" />
                            <Button 
                                variant="primary" 
                                type="submit" 
                                isLoading={isStarting}
                                disabled={!canAct}
                            >
                                ▶ Iniciar Reparación
                            </Button>
                        </form>

                        <Button 
                            variant="secondary" 
                            onClick={() => setShowAssignDialog(true)}
                            disabled={!isAdmin} // Only admin usually assigns manually, or self-assign logic (not implemented here yet)
                        >
                            👤 Asignar
                        </Button>

                        <Button 
                            variant="danger" 
                            onClick={() => setShowCancelDialog(true)}
                            disabled={!canAct}
                        >
                            ✕ Cancelar
                        </Button>
                    </>
                )}

                {/* IN_PROGRESS Actions */}
                {ticket.status === 'IN_PROGRESS' && (
                    <>
                        <Button 
                            variant="success" 
                            onClick={() => setShowResolveDialog(true)}
                            disabled={!canAct}
                        >
                            ✅ Marcar Resuelto
                        </Button>

                        <Button 
                            variant="warning" 
                            onClick={() => setShowWaitPartsDialog(true)}
                            disabled={!canAct}
                        >
                            ⏸ Pausar (Repuestos)
                        </Button>

                        <Button 
                            variant="danger" 
                            onClick={() => setShowCancelDialog(true)}
                            disabled={!canAct}
                        >
                            ✕ Cancelar
                        </Button>
                    </>
                )}

                {/* WAITING_FOR_PARTS Actions */}
                {ticket.status === 'WAITING_FOR_PARTS' && (
                    <>
                         <form action={resumeAction}>
                            <input type="hidden" name="ticketId" value={ticket.id} />
                            <input type="hidden" name="status" value="IN_PROGRESS" />
                            <input type="hidden" name="note" value="Reanudado desde espera" />
                            <Button 
                                variant="primary" 
                                type="submit" 
                                isLoading={isResuming}
                                disabled={!canAct}
                            >
                                ▶ Reanudar
                            </Button>
                        </form>

                        <Button 
                            variant="danger" 
                            onClick={() => setShowCancelDialog(true)}
                            disabled={!canAct}
                        >
                            ✕ Cancelar
                        </Button>
                    </>
                )}

                 {/* RESOLVED Actions */}
                 {ticket.status === 'RESOLVED' && (
                    <>
                        <form action={closeAction}>
                            <input type="hidden" name="ticketId" value={ticket.id} />
                            <input type="hidden" name="status" value="CLOSED" />
                            <input type="hidden" name="note" value="Entrega final al cliente" />
                            <Button 
                                variant="success" 
                                type="submit" 
                                isLoading={isClosing}
                                disabled={!canAct}
                            >
                                📦 Entregar y Cerrar
                            </Button>
                        </form>

                        <form action={reopenAction}>
                            <input type="hidden" name="ticketId" value={ticket.id} />
                            <input type="hidden" name="status" value="IN_PROGRESS" />
                            <input type="hidden" name="note" value="Reabierto por garantía/revisión" />
                            <Button 
                                variant="secondary" 
                                type="submit" 
                                isLoading={isReopening}
                                disabled={!canAct}
                            >
                                ↩ Reabrir
                            </Button>
                        </form>
                    </>
                )}

                {/* CLOSED/CANCELLED Actions */}
                {(ticket.status === 'CLOSED' || ticket.status === 'CANCELLED') && (
                     <form action={reopenAction}>
                        <input type="hidden" name="ticketId" value={ticket.id} />
                        <input type="hidden" name="status" value="OPEN" />
                        <input type="hidden" name="note" value="Ticket reabierto" />
                        <Button 
                            variant="secondary" 
                            type="submit" 
                            isLoading={isReopening}
                            disabled={!isAdmin}
                        >
                            ↩ Reabrir Caso
                        </Button>
                    </form>
                )}
            </div>

            {/* Render Dialogs */}
            <CancelTicketDialog 
                ticketId={ticket.id}
                isOpen={showCancelDialog}
                onClose={() => setShowCancelDialog(false)}
            />
            
            <ResolveTicketDialog
                ticketId={ticket.id}
                isOpen={showResolveDialog}
                onClose={() => setShowResolveDialog(false)}
            />

            <WaitForPartsDialog
                ticketId={ticket.id}
                isOpen={showWaitPartsDialog}
                onClose={() => setShowWaitPartsDialog(false)}
            />

            <AssignTechnicianDialog
                ticketId={ticket.id}
                currentTitle={ticket.title}
                currentDescription={ticket.description}
                currentStatus={ticket.status}
                currentPriority={ticket.priority || ''}
                users={availableUsers}
                isOpen={showAssignDialog}
                onClose={() => setShowAssignDialog(false)}
            />
        </div>
    );
}
