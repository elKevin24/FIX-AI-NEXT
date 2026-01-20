'use client';

import { useActionState } from 'react';
import { updateTicket, deleteTicket, updateTicketStatus, addTicketNote, deleteTicketNote } from '@/lib/actions';
import { generateInvoiceFromTicket } from '@/lib/invoice-actions';
import styles from '../tickets.module.css';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PartsSection from './PartsSection';
import ServicesSection from './ServicesSection';
import TimelineSection from './TimelineSection';
import { TimelineEvent } from '@/lib/timeline';

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
    const [updateState, updateAction, isUpdating] = useActionState(updateTicket, null);
    const [deleteState, deleteAction, isDeleting] = useActionState(deleteTicket, null);
    const [statusState, statusAction, isUpdatingStatus] = useActionState(updateTicketStatus, null);
    const [noteState, noteAction, isAddingNote] = useActionState(addTicketNote, null);
    const [deleteNoteState, deleteNoteAction, isDeletingNote] = useActionState(deleteTicketNote, null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [noteContent, setNoteContent] = useState('');
    const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    const currentStatus = STATUS_OPTIONS.find(s => s.value === ticket.status);

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
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link href="/dashboard/tickets" className={styles.viewLink}>
                        &larr; Volver
                    </Link>
                    <h1>Ticket #{ticket.id.slice(0, 8)}</h1>
                </div>
                {isSuperAdmin && (
                    <span className={styles.superAdminBadge}>
                        Tenant: {ticket.tenant.name}
                    </span>
                )}
            </div>

            {/* Quick Status Update */}
            <div className={styles.tableContainer} style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Estado Actual</h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {STATUS_OPTIONS.map((status) => (
                        <form key={status.value} action={statusAction} style={{ display: 'inline' }}>
                            <input type="hidden" name="ticketId" value={ticket.id} />
                            <input type="hidden" name="status" value={status.value} />
                            <button
                                type="submit"
                                disabled={isUpdatingStatus || ticket.status === status.value}
                                className={`${styles.status} ${styles[status.color]}`}
                                style={{
                                    cursor: ticket.status === status.value ? 'default' : 'pointer',
                                    opacity: ticket.status === status.value ? 1 : 0.6,
                                    border: ticket.status === status.value ? '2px solid currentColor' : '2px solid transparent',
                                    padding: '0.5rem 1rem',
                                }}
                            >
                                {status.label}
                            </button>
                        </form>
                    ))}
                </div>
                {statusState?.message && !statusState.success && (
                    <p className={styles.errorMessage}>{statusState.message}</p>
                )}
            </div>

            {/* Main Content */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                {/* Left Column - Ticket Details */}
                <div className={styles.tableContainer} style={{ padding: '2rem' }}>
                    {!isEditing ? (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                                <h2>{ticket.title}</h2>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className={styles.createBtn}
                                    style={{ padding: '0.5rem 1rem' }}
                                >
                                    Editar
                                </button>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ color: '#666', marginBottom: '0.5rem' }}>Descripción</h4>
                                <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{ticket.description}</p>
                            </div>

                            <div className={styles.gridTwoColumns}>
                                <div>
                                    <h4 style={{ color: '#666', marginBottom: '0.5rem' }}>Prioridad</h4>
                                    <span className={`${styles.status} ${ticket.priority === 'High' ? styles.waiting_for_parts : ticket.priority === 'Medium' ? styles.in_progress : styles.closed}`}>
                                        {ticket.priority || 'Sin definir'}
                                    </span>
                                </div>
                                <div>
                                    <h4 style={{ color: '#666', marginBottom: '0.5rem' }}>Asignado a</h4>
                                    <p>{ticket.assignedTo?.name || ticket.assignedTo?.email || 'Sin asignar'}</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <form action={updateAction} className={styles.form}>
                            <input type="hidden" name="ticketId" value={ticket.id} />

                            <div className={styles.formGroup}>
                                <label htmlFor="title" className={styles.label}>Título *</label>
                                <input
                                    id="title"
                                    name="title"
                                    type="text"
                                    required
                                    defaultValue={ticket.title}
                                    className={styles.input}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="description" className={styles.label}>Descripción *</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    required
                                    rows={5}
                                    defaultValue={ticket.description}
                                    className={styles.input}
                                />
                            </div>

                            <div className={styles.gridTwoColumns}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="status" className={styles.label}>Estado</label>
                                    <select
                                        id="status"
                                        name="status"
                                        defaultValue={ticket.status}
                                        className={styles.input}
                                    >
                                        {STATUS_OPTIONS.map((status) => (
                                            <option key={status.value} value={status.value}>
                                                {status.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="priority" className={styles.label}>Prioridad</label>
                                    <select
                                        id="priority"
                                        name="priority"
                                        defaultValue={ticket.priority || ''}
                                        className={styles.input}
                                    >
                                        {PRIORITY_OPTIONS.map((priority) => (
                                            <option key={priority.value} value={priority.value}>
                                                {priority.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="assignedToId" className={styles.label}>Asignar a</label>
                                <select
                                    id="assignedToId"
                                    name="assignedToId"
                                    defaultValue={ticket.assignedTo?.id || ''}
                                    className={styles.input}
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
                                <p className={styles.errorMessage}>
                                    {updateState.message}
                                </p>
                            )}

                            <div className={styles.actions}>
                                <button
                                    type="submit"
                                    className={styles.createBtn}
                                    disabled={isUpdating}
                                >
                                    {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className={styles.cancelBtn}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Right Column - Info & Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Customer Info */}
                    <div className={styles.tableContainer} style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Cliente</h3>
                        <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{ticket.customer.name}</p>
                        {ticket.customer.email && (
                            <p style={{ fontSize: '0.9rem', color: '#666' }}>{ticket.customer.email}</p>
                        )}
                        {ticket.customer.phone && (
                            <p style={{ fontSize: '0.9rem', color: '#666' }}>{ticket.customer.phone}</p>
                        )}
                        <Link
                            href={`/dashboard/customers/${ticket.customer.id}/edit`}
                            className={styles.viewLink}
                            style={{ display: 'inline-block', marginTop: '0.5rem' }}
                        >
                            Ver cliente
                        </Link>
                    </div>

                    {/* Dates */}
                    <div className={styles.tableContainer} style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Fechas</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                            <div>
                                <span style={{ color: '#666' }}>Creado:</span>{' '}
                                {new Date(ticket.createdAt).toLocaleString('es-ES')}
                            </div>
                            <div>
                                <span style={{ color: '#666' }}>Actualizado:</span>{' '}
                                {new Date(ticket.updatedAt).toLocaleString('es-ES')}
                            </div>
                        </div>
                    </div>

                    {/* PDF Documents */}
                    <div className={styles.tableContainer} style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Documentos</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <a
                                href={`/api/tickets/${ticket.id}/pdf/work-order`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.createBtn}
                                style={{
                                    padding: '0.5rem 1rem',
                                    textAlign: 'center',
                                    textDecoration: 'none',
                                    fontSize: '0.9rem',
                                    display: 'block'
                                }}
                            >
                                📄 Orden de Ingreso
                            </a>

                            {/* Facturación */}
                            {ticket.invoice ? (
                                <Link
                                    href={`/dashboard/invoices/${ticket.invoice.id}`}
                                    className={styles.createBtn}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        textAlign: 'center',
                                        textDecoration: 'none',
                                        fontSize: '0.9rem',
                                        display: 'block',
                                        backgroundColor: '#8b5cf6'
                                    }}
                                >
                                    💰 Ver Factura ({ticket.invoice.invoiceNumber})
                                </Link>
                            ) : (
                                (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && isAdmin && (
                                    <button
                                        onClick={async () => {
                                            if (confirm('¿Generar factura para este ticket?')) {
                                                setIsGeneratingInvoice(true);
                                                try {
                                                    await generateInvoiceFromTicket({ ticketId: ticket.id });
                                                    router.refresh();
                                                } catch (e: any) {
                                                    alert(e.message || 'Error al generar factura');
                                                } finally {
                                                    setIsGeneratingInvoice(false);
                                                }
                                            }
                                        }}
                                        disabled={isGeneratingInvoice}
                                        className={styles.createBtn}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            textAlign: 'center',
                                            fontSize: '0.9rem',
                                            display: 'block',
                                            backgroundColor: '#f59e0b',
                                            width: '100%'
                                        }}
                                    >
                                        {isGeneratingInvoice ? 'Generando...' : '💰 Generar Factura'}
                                    </button>
                                )
                            )}

                            {(ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && (
                                <a
                                    href={`/api/tickets/${ticket.id}/pdf/delivery-receipt`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.createBtn}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        textAlign: 'center',
                                        textDecoration: 'none',
                                        fontSize: '0.9rem',
                                        display: 'block',
                                        backgroundColor: '#10b981'
                                    }}
                                >
                                    ✓ Comprobante de Entrega
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Delete Zone - Only for admins */}
                    {isAdmin && (
                        <div className={styles.dangerZone}>
                            <h3 className={styles.dangerTitle}>Zona de Peligro</h3>

                            {!showDeleteConfirm ? (
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className={styles.dangerBtn}
                                    style={{ width: '100%' }}
                                >
                                    Eliminar Ticket
                                </button>
                            ) : (
                                <div className={styles.formGroup}>
                                    <p className={styles.errorMessage} style={{ backgroundColor: 'transparent', border: 'none', padding: 0 }}>
                                        ¿Eliminar este ticket? Esta acción no se puede deshacer.
                                    </p>

                                    <form action={deleteAction}>
                                        <input type="hidden" name="ticketId" value={ticket.id} />

                                        {deleteState?.message && (
                                            <p className={styles.errorMessage}>
                                                {deleteState.message}
                                            </p>
                                        )}

                                        <div className={styles.actions}>
                                            <button
                                                type="submit"
                                                className={styles.dangerBtn}
                                                disabled={isDeleting}
                                            >
                                                {isDeleting ? 'Eliminando...' : 'Confirmar'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowDeleteConfirm(false)}
                                                className={styles.cancelBtn}
                                            >
                                                Cancelar
                                            </button>
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
            />

            {/* Notes Section & Timeline */}
            <div className={styles.tableContainer} style={{ padding: '2rem', marginTop: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Bitácora de Reparación y Auditoría ({timelineEvents.length} eventos)</h3>

                {/* Add Note Form */}
                <form ref={formRef} action={noteAction} style={{ marginBottom: '2rem' }}>
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <input type="hidden" name="isInternal" value="true" />

                    <div className={styles.formGroup}>
                        <textarea
                            name="content"
                            rows={3}
                            placeholder="Agregar una nota sobre la reparación..."
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            className={styles.input}
                            style={{ resize: 'vertical', minHeight: '80px', width: '100%' }}
                        />
                    </div>

                    {noteState?.message && !noteState.success && (
                        <p className={styles.errorMessage}>
                            {noteState.message}
                        </p>
                    )}

                    <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
                        <button
                            type="submit"
                            className={styles.createBtn}
                            disabled={isAddingNote || !noteContent.trim()}
                            style={{ padding: '0.5rem 1rem' }}
                        >
                            {isAddingNote ? 'Agregando...' : 'Agregar Nota'}
                        </button>
                    </div>
                </form>

                {/* Unified Timeline List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {timelineEvents.length === 0 ? (
                        <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
                            No hay eventos registrados.
                        </p>
                    ) : (
                        timelineEvents.map((event) => (
                            <div
                                key={event.id}
                                style={{
                                    padding: '1rem',
                                    backgroundColor: event.type === 'NOTE' ? '#f9f9f9' : '#f0f9ff',
                                    borderRadius: '8px',
                                    border: event.type === 'NOTE' ? '1px solid #eee' : '1px solid #bae6fd',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ 
                                            fontWeight: '600', 
                                            color: event.type === 'NOTE' ? '#333' : '#0369a1' 
                                        }}>
                                            {event.author.name || event.author.email || 'Sistema'}
                                        </span>
                                        {event.type === 'LOG' && (
                                            <span style={{
                                                fontSize: '0.7rem',
                                                backgroundColor: '#0ea5e9',
                                                color: 'white',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                textTransform: 'uppercase'
                                            }}>
                                                Sistema
                                            </span>
                                        )}
                                        <span style={{ fontSize: '0.8rem', color: '#999' }}>
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
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#999',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem',
                                                    padding: '0.25rem 0.5rem',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.color = '#dc2626'}
                                                onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
                                            >
                                                Eliminar
                                            </button>
                                        </form>
                                    )}
                                </div>
                                <p style={{ 
                                    whiteSpace: 'pre-wrap', 
                                    lineHeight: '1.5', 
                                    color: event.type === 'NOTE' ? '#444' : '#0c4a6e'
                                }}>
                                    {event.content}
                                </p>
                            </div>
                        ))
                    )}
                </div>

                {deleteNoteState?.message && !deleteNoteState.success && (
                    <p className={styles.errorMessage}>
                        {deleteNoteState.message}
                    </p>
                )}
            </div>
        </div>
    );
}