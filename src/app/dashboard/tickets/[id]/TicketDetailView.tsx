'use client';

import { useActionState } from 'react';
import { updateTicket, deleteTicket, updateTicketStatus, addTicketNote, deleteTicketNote } from '@/lib/actions';
import styles from '../tickets.module.css';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
    isSuperAdmin: boolean;
    isAdmin: boolean;
    currentUserId: string;
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

export default function TicketDetailView({ ticket, availableUsers, isSuperAdmin, isAdmin, currentUserId }: Props) {
    const router = useRouter();
    const [updateState, updateAction, isUpdating] = useActionState(updateTicket, null);
    const [deleteState, deleteAction, isDeleting] = useActionState(deleteTicket, null);
    const [statusState, statusAction, isUpdatingStatus] = useActionState(updateTicketStatus, null);
    const [noteState, noteAction, isAddingNote] = useActionState(addTicketNote, null);
    const [deleteNoteState, deleteNoteAction, isDeletingNote] = useActionState(deleteTicketNote, null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [noteContent, setNoteContent] = useState('');
    const formRef = useRef<HTMLFormElement>(null);

    const currentStatus = STATUS_OPTIONS.find(s => s.value === ticket.status);

    // Refresh page when note is added successfully
    useEffect(() => {
        if (noteState?.success) {
            setNoteContent('');
            formRef.current?.reset();
            router.refresh();
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
                    <p className="text-red-500 mt-2">{statusState.message}</p>
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

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                        <form action={updateAction} className="flex flex-col gap-4">
                            <input type="hidden" name="ticketId" value={ticket.id} />

                            <div className="flex flex-col gap-2">
                                <label htmlFor="title">Título *</label>
                                <input
                                    id="title"
                                    name="title"
                                    type="text"
                                    required
                                    defaultValue={ticket.title}
                                    className="p-2 border rounded text-black"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="description">Descripción *</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    required
                                    rows={5}
                                    defaultValue={ticket.description}
                                    className="p-2 border rounded text-black"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="status">Estado</label>
                                    <select
                                        id="status"
                                        name="status"
                                        defaultValue={ticket.status}
                                        className="p-2 border rounded text-black"
                                    >
                                        {STATUS_OPTIONS.map((status) => (
                                            <option key={status.value} value={status.value}>
                                                {status.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label htmlFor="priority">Prioridad</label>
                                    <select
                                        id="priority"
                                        name="priority"
                                        defaultValue={ticket.priority || ''}
                                        className="p-2 border rounded text-black"
                                    >
                                        {PRIORITY_OPTIONS.map((priority) => (
                                            <option key={priority.value} value={priority.value}>
                                                {priority.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="assignedToId">Asignar a</label>
                                <select
                                    id="assignedToId"
                                    name="assignedToId"
                                    defaultValue={ticket.assignedTo?.id || ''}
                                    className="p-2 border rounded text-black"
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
                                <p className="text-red-500 bg-red-50 p-2 rounded border border-red-200">
                                    {updateState.message}
                                </p>
                            )}

                            <div className="flex gap-3 mt-4">
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
                                    className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
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

                    {/* Delete Zone - Only for admins */}
                    {isAdmin && (
                        <div className={styles.tableContainer} style={{ padding: '1.5rem', borderColor: '#fee2e2' }}>
                            <h3 style={{ color: '#dc2626', marginBottom: '1rem' }}>Zona de Peligro</h3>

                            {!showDeleteConfirm ? (
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 w-full"
                                >
                                    Eliminar Ticket
                                </button>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <p className="text-red-600 text-sm">
                                        ¿Eliminar este ticket? Esta acción no se puede deshacer.
                                    </p>

                                    <form action={deleteAction}>
                                        <input type="hidden" name="ticketId" value={ticket.id} />

                                        {deleteState?.message && (
                                            <p className="text-red-500 bg-red-50 p-2 rounded border border-red-200 mb-2 text-sm">
                                                {deleteState.message}
                                            </p>
                                        )}

                                        <div className="flex gap-2">
                                            <button
                                                type="submit"
                                                className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                                disabled={isDeleting}
                                            >
                                                {isDeleting ? 'Eliminando...' : 'Confirmar'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowDeleteConfirm(false)}
                                                className="px-3 py-2 border rounded text-gray-600 hover:bg-gray-100 text-sm"
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

            {/* Notes Section */}
            <div className={styles.tableContainer} style={{ padding: '2rem', marginTop: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Bitácora de Reparación ({ticket.notes.length} nota{ticket.notes.length !== 1 ? 's' : ''})</h3>

                {/* Add Note Form */}
                <form ref={formRef} action={noteAction} style={{ marginBottom: '2rem' }}>
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <input type="hidden" name="isInternal" value="true" />

                    <div className="flex flex-col gap-2">
                        <textarea
                            name="content"
                            rows={3}
                            placeholder="Agregar una nota sobre la reparación..."
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            className="p-3 border rounded text-black w-full"
                            style={{ resize: 'vertical', minHeight: '80px' }}
                        />
                    </div>

                    {noteState?.message && !noteState.success && (
                        <p className="text-red-500 bg-red-50 p-2 rounded border border-red-200 mt-2">
                            {noteState.message}
                        </p>
                    )}

                    <div className="flex justify-end mt-3">
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

                {/* Notes List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {ticket.notes.length === 0 ? (
                        <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
                            No hay notas todavía. Agrega la primera nota para comenzar la bitácora.
                        </p>
                    ) : (
                        ticket.notes.map((note) => (
                            <div
                                key={note.id}
                                style={{
                                    padding: '1rem',
                                    backgroundColor: '#f9f9f9',
                                    borderRadius: '8px',
                                    border: '1px solid #eee',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontWeight: '600', color: '#333' }}>
                                            {note.author.name || note.author.email}
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: '#999' }}>
                                            {new Date(note.createdAt).toLocaleString('es-ES')}
                                        </span>
                                    </div>

                                    {/* Delete button - only for author or admin */}
                                    {(note.author.id === currentUserId || isAdmin) && (
                                        <form action={deleteNoteAction}>
                                            <input type="hidden" name="noteId" value={note.id} />
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
                                <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', color: '#444' }}>
                                    {note.content}
                                </p>
                            </div>
                        ))
                    )}
                </div>

                {deleteNoteState?.message && !deleteNoteState.success && (
                    <p className="text-red-500 bg-red-50 p-2 rounded border border-red-200 mt-2">
                        {deleteNoteState.message}
                    </p>
                )}
            </div>
        </div>
    );
}
