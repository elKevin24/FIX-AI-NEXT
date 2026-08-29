'use client';

import { useActionState } from 'react';
import { updateTicket, deleteTicket, addTicketNote, deleteTicketNote } from '@/lib/actions';
import { generateInvoiceFromTicket } from '@/lib/invoice-actions';
import styles from '../tickets.module.css';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import PartsSection from './PartsSection';
import ServicesSection from './ServicesSection';
import AttachmentsSection from '@/components/tickets/AttachmentsSection';
import { TimelineEvent } from '@/lib/timeline';
import TicketWorkflowActions from '@/components/tickets/TicketWorkflowActions';

interface Part {
    id: string;
    name: string;
    sku: string | null;
    quantity: number;
    cost: any;
    price: any;
    category?: string | null;
    location?: string | null;
    minStock?: number;
}

interface Service {
    id: string;
    name: string;
    laborCost: any;
}

interface PartUsage {
    id: string;
    quantity: number;
    createdAt: Date;
    approved: boolean;
    priceAtProposal?: any;
    part: Part;
}

interface ServiceUsage {
    id: string;
    name: string;
    laborCost: any;
    createdAt: Date;
    serviceId: string;
}

interface TicketNote {
    id: string;
    content: string;
    isInternal: boolean;
    createdAt: Date;
    author: {
        id: string;
        name: string | null;
        email: string;
    };
}

interface Ticket {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string | null;
    createdAt: Date;
    updatedAt: Date;
    customer: {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
    };
    assignedTo: {
        id: string;
        name: string | null;
        email: string;
    } | null;
    tenant: {
        id: string;
        name: string;
    };
    notes: TicketNote[];
    partsUsed: PartUsage[];
    services: ServiceUsage[];
    invoice?: any | null;
    attachments?: any[];
}

interface User {
    id: string;
    name: string | null;
    email: string;
    role: string;
}

interface Props {
    ticket: Ticket;
    availableUsers: User[];
    availableParts: Part[];
    availableServices: Service[];
    isSuperAdmin: boolean;
    isAdmin: boolean;
    currentUserId: string;
    timelineEvents: TimelineEvent[];
}

const STATUS_OPTIONS = [
    { value: 'OPEN', label: 'Abierto', color: 'open' },
    { value: 'WAITING_APPROVAL', label: 'Esperando Aprobación', color: 'waiting_approval' },
    { value: 'IN_PROGRESS', label: 'En Progreso', color: 'in_progress' },
    { value: 'WAITING_FOR_PARTS', label: 'Esperando Repuestos', color: 'waiting_for_parts' },
    { value: 'RESOLVED', label: 'Resuelto', color: 'resolved' },
    { value: 'CLOSED', label: 'Cerrado', color: 'closed' },
];

const PRIORITY_OPTIONS = [
    { value: '', label: 'Sin prioridad' },
    { value: 'Low', label: 'Baja' },
    { value: 'Medium', label: 'Media' },
    { value: 'High', label: 'Alta' },
];

export default function TicketDetailView({ ticket, availableUsers, availableParts, availableServices, isSuperAdmin, isAdmin, currentUserId, timelineEvents }: Props) {
    const router = useRouter();
    const { addToast } = useToast();
    const [updateState, updateAction, isUpdating] = useActionState(updateTicket, null);
    const [deleteState, deleteAction, isDeleting] = useActionState(deleteTicket, null);
    const [noteState, noteAction, isAddingNote] = useActionState(addTicketNote, null);
    const [deleteNoteState, deleteNoteAction, isDeletingNote] = useActionState(deleteTicketNote, null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');
    const isDeleteReasonValid = deleteReason.trim().length >= 10;
    const [isEditing, setIsEditing] = useState(false);
    const [noteContent, setNoteContent] = useState('');
    const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    // Refresh page when note is added successfully
    useEffect(() => {
        if (noteState?.success) {
            setTimeout(() => {
                setNoteContent('');
                formRef.current?.reset();
                router.refresh();
            }, 0);
        }
    }, [noteState, router]);

    useEffect(() => {
        if (deleteNoteState?.success) {
            router.refresh();
        }
    }, [deleteNoteState, router]);

    return (
        <div className={styles['container']}>
            {/* Header */}
            <PageHeader
                title={`Ticket #${ticket.id.slice(0, 8)}`}
                subtitle={ticket.title}
                actions={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <Button as={Link} href="/dashboard/tickets" variant="secondary" size="sm" leftIcon={<span aria-hidden="true">←</span>}>
                            Volver a Tickets
                        </Button>
                        {isSuperAdmin && (
                            <span className={styles['superAdminBadge']}>
                                Tenant: {ticket.tenant.name}
                            </span>
                        )}
                    </div>
                }
            />

            {/* Workflow Actions (New) */}
            <TicketWorkflowActions 
                ticket={ticket}
                availableUsers={availableUsers}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
            />

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Ticket Details */}
                <div className={`${styles['section']} lg:col-span-2`}>
                    {!isEditing ? (
                        <>
                            <div className={styles['sectionHeader']}>
                                <h2 className={styles['sectionTitle']}>{ticket.title}</h2>
                                <Button
                                    onClick={() => setIsEditing(true)}
                                    variant="secondary"
                                    size="sm"
                                >
                                    Editar
                                </Button>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <span className={styles['label']} style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Descripción</span>
                                <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{ticket.description}</p>
                            </div>

                            <div className={styles['gridTwoColumns']}>
                                <div>
                                    <span className={styles['label']} style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Prioridad</span>
                                    <span className={`${styles['status']} ${ticket.priority === 'High' ? styles['waiting_for_parts'] : ticket.priority === 'Medium' ? styles['in_progress'] : styles['closed']}`}>
                                        {ticket.priority || 'Sin definir'}
                                    </span>
                                </div>
                                <div>
                                    <span className={styles['label']} style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Asignado a</span>
                                    <p><strong>{ticket.assignedTo?.name || ticket.assignedTo?.email || 'Sin asignar'}</strong></p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <form action={updateAction} className={styles['form']}>
                            <input type="hidden" name="ticketId" value={ticket.id} />

                            <div className={styles['formGroup']}>
                                <label htmlFor="title" className={styles['label']}>Título *</label>
                                <input
                                    id="title"
                                    name="title"
                                    type="text"
                                    required
                                    defaultValue={ticket.title}
                                    className={styles['input']}
                                />
                            </div>

                            <div className={styles['formGroup']}>
                                <label htmlFor="description" className={styles['label']}>Descripción *</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    required
                                    rows={5}
                                    defaultValue={ticket.description}
                                    className={styles['input']}
                                />
                            </div>

                            <div className={styles['gridTwoColumns']}>
                                <div className={styles['formGroup']}>
                                    <label htmlFor="status" className={styles['label']}>Estado</label>
                                    <select
                                        id="status"
                                        name="status"
                                        defaultValue={ticket.status}
                                        className={styles['select']}
                                    >
                                        {STATUS_OPTIONS.map((status) => (
                                            <option key={status.value} value={status.value}>
                                                {status.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className={styles['formGroup']}>
                                    <label htmlFor="priority" className={styles['label']}>Prioridad</label>
                                    <select
                                        id="priority"
                                        name="priority"
                                        defaultValue={ticket.priority || ''}
                                        className={styles['select']}
                                    >
                                        {PRIORITY_OPTIONS.map((priority) => (
                                            <option key={priority.value} value={priority.value}>
                                                {priority.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className={styles['formGroup']}>
                                <label htmlFor="assignedToId" className={styles['label']}>Asignar a</label>
                                <select
                                    id="assignedToId"
                                    name="assignedToId"
                                    defaultValue={ticket.assignedTo?.id || ''}
                                    className={styles['select']}
                                >
                                    <option value="">Sin asignar</option>
                                    {availableUsers.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name || user.email} ({user.role === 'ADMIN' ? 'Admin' : 'Técnico'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {updateState?.message && (
                                <p className={styles['errorMessage']}>
                                    {updateState.message}
                                </p>
                            )}

                            <div className={styles['actions']}>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="sm"
                                    isLoading={isUpdating}
                                >
                                    Guardar Cambios
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsEditing(false)}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Right Column - Customer Info & Timeline */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    {/* Customer Info */}
                    <div className={styles['section']} style={{ padding: '1.25rem', marginTop: 0 }}>
                        <h3 className={styles['label']} style={{ marginBottom: '0.75rem' }}>Cliente</h3>
                        <p style={{ fontWeight: '600', marginBottom: '0.25rem', color: 'var(--color-text-primary)' }}>{ticket.customer.name}</p>
                        {ticket.customer.email && (
                            <p className={styles['textMuted']} style={{ fontSize: '0.875rem', margin: '0.125rem 0' }}>{ticket.customer.email}</p>
                        )}
                        {ticket.customer.phone && (
                            <p className={styles['textMuted']} style={{ fontSize: '0.875rem', margin: '0.125rem 0' }}>{ticket.customer.phone}</p>
                        )}
                        <Button
                            as={Link}
                            href={`/dashboard/customers/${ticket.customer.id}/edit`}
                            variant="secondary"
                            size="sm"
                            style={{ marginTop: '0.75rem' }}
                        >
                            Ver cliente
                        </Button>
                    </div>

                    {/* Dates */}
                    <div className={styles['section']} style={{ padding: '1.25rem', marginTop: 0 }}>
                        <h3 className={styles['label']} style={{ marginBottom: '0.75rem' }}>Fechas</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                            <div>
                                <span className={styles['textMuted']}>Creado:</span>{' '}
                                <strong style={{ color: 'var(--color-text-primary)' }}>{new Date(ticket.createdAt).toLocaleString('es-ES')}</strong>
                            </div>
                            <div>
                                <span className={styles['textMuted']}>Actualizado:</span>{' '}
                                <strong style={{ color: 'var(--color-text-primary)' }}>{new Date(ticket.updatedAt).toLocaleString('es-ES')}</strong>
                            </div>
                        </div>
                    </div>

                    {/* PDF Documents */}
                    <div className={styles['section']} style={{ padding: '1.25rem', marginTop: 0 }}>
                        <h3 className={styles['label']} style={{ marginBottom: '0.75rem' }}>Documentos y Formatos</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <Button
                                as="a"
                                href={`/api/tickets/${ticket.id}/pdf/work-order`}
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="secondary"
                                size="sm"
                                fullWidth
                                leftIcon={<span aria-hidden="true">📄</span>}
                            >
                                Orden de Ingreso (PDF)
                            </Button>

                            <Button
                                as={Link}
                                href={`/dashboard/tickets/${ticket.id}/ticket80mm`}
                                variant="secondary"
                                size="sm"
                                fullWidth
                                leftIcon={<span aria-hidden="true">🖨️</span>}
                            >
                                Ticket Térmico 80mm
                            </Button>

                            {/* Facturación */}
                            {ticket.invoice ? (
                                <Button
                                    as={Link}
                                    href={`/dashboard/invoices/${ticket.invoice.id}`}
                                    variant="primary"
                                    size="sm"
                                    fullWidth
                                    leftIcon={<span aria-hidden="true">💰</span>}
                                >
                                    Ver Factura ({ticket.invoice.invoiceNumber})
                                </Button>
                            ) : (
                                (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && isAdmin && (
                                    <Button
                                        onClick={async () => {
                                            if (confirm('¿Generar factura para este ticket?')) {
                                                setIsGeneratingInvoice(true);
                                                try {
                                                    await generateInvoiceFromTicket({ ticketId: ticket.id });
                                                    router.refresh();
                                                } catch (e: any) {
                                                    addToast(e.message || 'Error al generar factura', 'ERROR');
                                                } finally {
                                                    setIsGeneratingInvoice(false);
                                                }
                                            }
                                        }}
                                        disabled={isGeneratingInvoice}
                                        isLoading={isGeneratingInvoice}
                                        variant="warning"
                                        size="sm"
                                        fullWidth
                                        leftIcon={<span aria-hidden="true">💰</span>}
                                    >
                                        Generar Factura
                                    </Button>
                                )
                            )}

                            {(ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && (
                                <Button
                                    as="a"
                                    href={`/api/tickets/${ticket.id}/pdf/delivery-receipt`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    variant="success"
                                    size="sm"
                                    fullWidth
                                    leftIcon={<span aria-hidden="true">✓</span>}
                                >
                                    Comprobante de Entrega
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* File Attachments */}
                    <div className={styles['section']} style={{ padding: 0, marginTop: 0, border: 'none' }}>
                         <AttachmentsSection 
                             ticketId={ticket.id} 
                             initialAttachments={ticket.attachments || []} 
                         />
                    </div>

                    {/* Delete Zone - Only for admins */}
                    {isAdmin && (
                        <div className={styles['dangerZone']} style={{ marginTop: 0 }}>
                            <h3 className={styles['dangerTitle']}>Zona de Peligro</h3>

                            {!showDeleteConfirm ? (
                                <Button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    variant="danger"
                                    size="sm"
                                    fullWidth
                                >
                                    Eliminar Ticket
                                </Button>
                            ) : (
                                <div className={styles['formGroup']}>
                                    <p className={styles['textDanger']} style={{ fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>
                                        ¿Eliminar este ticket? Esta acción no se puede deshacer.
                                    </p>

                                    <form action={deleteAction}>
                                        <input type="hidden" name="ticketId" value={ticket.id} />

                                        <div style={{ margin: '0.75rem 0' }}>
                                            <label htmlFor="delete-reason" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
                                                Motivo de eliminación * (mínimo 10 caracteres)
                                            </label>
                                            <textarea
                                                id="delete-reason"
                                                name="reason"
                                                value={deleteReason}
                                                onChange={(e) => setDeleteReason(e.target.value)}
                                                placeholder="Ej: Registro duplicado / Creado por error..."
                                                minLength={10}
                                                required
                                                rows={2}
                                                className={styles['textarea']}
                                            />
                                            <small style={{ color: isDeleteReasonValid ? 'var(--color-success-600)' : 'var(--color-error-600)', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                                                {deleteReason.trim().length} / 10 caracteres mínimos
                                            </small>
                                        </div>

                                        {deleteState?.message && (
                                            <p className={styles['errorMessage']}>
                                                {deleteState.message}
                                            </p>
                                        )}

                                        <div className={styles['actions']}>
                                            <Button
                                                type="submit"
                                                variant="danger"
                                                size="sm"
                                                isLoading={isDeleting}
                                                disabled={isDeleting || !isDeleteReasonValid}
                                            >
                                                Confirmar
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={() => {
                                                    setShowDeleteConfirm(false);
                                                    setDeleteReason('');
                                                }}
                                                variant="ghost"
                                                size="sm"
                                            >
                                                Cancelar
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Services Section */}
            <ServicesSection
                ticketId={ticket.id}
                servicesUsed={ticket.services}
                availableServices={availableServices}
            />

            {/* Parts Section */}
            <PartsSection
                ticketId={ticket.id}
                partsUsed={ticket.partsUsed}
                availableParts={availableParts}
                ticketStatus={ticket.status}
                canApprove={isAdmin || isSuperAdmin}
            />

            {/* Notes Section & Timeline */}
            <div className={styles['section']}>
                <h3 className={styles['sectionTitle']} style={{ marginBottom: '1.5rem' }}>Bitácora de Reparación y Auditoría ({timelineEvents.length} eventos)</h3>

                {/* Add Note Form */}
                <form ref={formRef} action={noteAction} style={{ marginBottom: '2rem' }}>
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <input type="hidden" name="isInternal" value="true" />

                    <div className={styles['formGroup']}>
                        <textarea
                            name="content"
                            rows={3}
                            placeholder="Agregar una nota sobre la reparación..."
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            className={styles['textarea']}
                            style={{ minHeight: '80px' }}
                        />
                    </div>

                    {noteState?.message && !noteState.success && (
                        <p className={styles['errorMessage']}>
                            {noteState.message}
                        </p>
                    )}

                    <div className={styles['actions']} style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            isLoading={isAddingNote}
                            disabled={isAddingNote || !noteContent.trim()}
                        >
                            Agregar Nota
                        </Button>
                    </div>
                </form>

                {/* Unified Timeline List */}
                <div className={styles['timeline']}>
                    {timelineEvents.length === 0 ? (
                        <div className={styles['emptyState']}>
                            No hay eventos registrados.
                        </div>
                    ) : (
                        timelineEvents.map((event) => {
                            let entryClass;
                            let Badge = null;

                            switch (event.type) {
                                case 'NOTE':
                                    entryClass = `${styles['logEntry']} ${styles['logEntryNote']}`;
                                    break;
                                case 'STATUS_CHANGE':
                                    entryClass = `${styles['logEntry']} ${styles['logEntryStatus']}`;
                                    Badge = <span className={styles['statusTag']}>Estado</span>;
                                    break;
                                case 'INVENTORY_MOVEMENT':
                                    entryClass = `${styles['logEntry']} ${styles['logEntryInventory']}`;
                                    Badge = <span className={styles['inventoryTag']}>Inventario</span>;
                                    break;
                                case 'SERVICE_USAGE':
                                    entryClass = `${styles['logEntry']} ${styles['logEntryService']}`;
                                    Badge = <span className={styles['serviceTag']}>Servicio</span>;
                                    break;
                                case 'LOG':
                                default:
                                    entryClass = `${styles['logEntry']} ${styles['logEntrySystem']}`;
                                    Badge = <span className={styles['systemTag']}>Sistema</span>;
                                    break;
                            }

                            return (
                                <div
                                    key={event.id}
                                    className={entryClass}
                                >
                                    <div className={styles['logHeader']}>
                                        <div className={styles['logMeta']}>
                                            <span className={styles['authorName']}>
                                                {event.author.name || event.author.email || 'Sistema'}
                                            </span>
                                            {Badge}
                                            <span className={styles['logDate']}>
                                                {new Date(event.date).toLocaleString('es-ES')}
                                            </span>
                                        </div>

                                        {/* Delete button - only for NOTE and author/admin */}
                                        {event.type === 'NOTE' && (event.author.email === ticket.notes.find(n => n.id === event.id)?.author?.email || isAdmin) && (
                                            <form action={deleteNoteAction}>
                                                <input type="hidden" name="noteId" value={event.id} />
                                                <button
                                                    type="submit"
                                                    disabled={isDeletingNote}
                                                    className={styles['textDanger']}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        textDecoration: 'underline'
                                                    }}
                                                    aria-label="Eliminar nota"
                                                >
                                                    {isDeletingNote ? 'Eliminando...' : 'Eliminar'}
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                    <p className={styles['logContent']}>
                                        {event.content}
                                    </p>
                                </div>
                            );
                        })
                    )}
                </div>

                {deleteNoteState?.message && !deleteNoteState.success && (
                    <p className={styles['errorMessage']}>
                        {deleteNoteState.message}
                    </p>
                )}
            </div>
        </div>
    );
}
