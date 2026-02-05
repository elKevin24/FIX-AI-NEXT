'use client';

import { useActionState } from 'react';
import { updateUser, deleteUser } from '@/lib/actions';
import styles from '../../../tickets/tickets.module.css';
import Link from 'next/link';
import { useState } from 'react';

interface User {
    id: string;
    name: string | null;
    email: string;
    role: 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'VIEWER';
    tenantId: string;
    tenant: {
        name: string;
    };
}

interface Props {
    user: User;
    currentUserId: string;
    isSuperAdmin: boolean;
}

export default function EditUserForm({ user, currentUserId, isSuperAdmin }: Props) {
    const [updateState, updateAction, isUpdating] = useActionState(updateUser, null);
    const [deleteState, deleteAction, isDeleting] = useActionState(deleteUser, null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const isCurrentUser = user.id === currentUserId;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Editar Usuario</h1>
                <Link href="/dashboard/users" className={styles.viewLink}>
                    &larr; Volver a usuarios
                </Link>
            </div>

            {isSuperAdmin && (
                <div className={styles.superAdminBadge} style={{ width: 'fit-content', marginBottom: '1rem' }}>
                    Tenant: {user.tenant.name}
                </div>
            )}

            <div className={styles.tableContainer} style={{ padding: '2rem' }}>
                <form action={updateAction} className={styles.form} style={{ maxWidth: '32rem' }}>
                    <input type="hidden" name="userId" value={user.id} />

                    <div className={styles.formGroup}>
                        <label htmlFor="name" className={styles.label}>Nombre</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            defaultValue={user.name || ''}
                            placeholder="Nombre completo"
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="email" className={styles.label}>Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            defaultValue={user.email}
                            placeholder="usuario@ejemplo.com"
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="password" className={styles.label}>Nueva Contraseña (opcional)</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            minLength={6}
                            placeholder="Dejar vacío para mantener la actual"
                            className={styles.input}
                        />
                        <span className={styles.textGray} style={{ fontSize: '0.875rem' }}>
                            Solo completa si deseas cambiar la contraseña
                        </span>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="role" className={styles.label}>Rol</label>
                        <select
                            id="role"
                            name="role"
                            required
                            defaultValue={user.role}
                            className={styles.input}
                            disabled={isCurrentUser}
                        >
                            <option value="ADMIN">Administrador</option>
                            <option value="MANAGER">Gerente</option>
                            <option value="TECHNICIAN">Técnico</option>
                            <option value="VIEWER">Visualizador</option>
                        </select>
                        {isCurrentUser && (
                            <span style={{ color: 'var(--color-warning-600)', fontSize: '0.875rem' }}>
                                No puedes cambiar tu propio rol
                            </span>
                        )}
                    </div>

                    <div aria-live="polite">
                        {updateState?.message && (
                            <p className={styles.errorMessage}>
                                {updateState.message}
                            </p>
                        )}
                    </div>

                    <div className={styles.actions}>
                        <button
                            type="submit"
                            className={styles.createBtn}
                            disabled={isUpdating}
                        >
                            {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                        <Link
                            href="/dashboard/users"
                            className={styles.cancelBtn}
                            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                        >
                            Cancelar
                        </Link>
                    </div>
                </form>
            </div>

            {/* Delete Section */}
            {!isCurrentUser && (
                <div className={styles.dangerZone} style={{ marginTop: '2rem' }}>
                    <h2 className={styles.dangerTitle}>Zona de Peligro</h2>

                    {!showDeleteConfirm ? (
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className={styles.dangerBtn}
                        >
                            Eliminar Usuario
                        </button>
                    ) : (
                        <div className={styles.formGroup}>
                            <p style={{ color: 'var(--color-danger-600)' }}>
                                ¿Estás seguro de que deseas eliminar a <strong>{user.name || user.email}</strong>?
                                Esta acción no se puede deshacer.
                            </p>

                            <form action={deleteAction}>
                                <input type="hidden" name="userId" value={user.id} />

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
                                        {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Usuario'}
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
    );
}