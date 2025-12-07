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
    role: 'ADMIN' | 'TECHNICIAN' | 'RECEPTIONIST';
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
                <form action={updateAction} className="flex flex-col gap-4 max-w-lg">
                    <input type="hidden" name="userId" value={user.id} />

                    <div className="flex flex-col gap-2">
                        <label htmlFor="name">Nombre</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            defaultValue={user.name || ''}
                            placeholder="Nombre completo"
                            className="p-2 border rounded text-black"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            defaultValue={user.email}
                            placeholder="usuario@ejemplo.com"
                            className="p-2 border rounded text-black"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="password">Nueva Contraseña (opcional)</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            minLength={6}
                            placeholder="Dejar vacío para mantener la actual"
                            className="p-2 border rounded text-black"
                        />
                        <span className="text-sm text-gray-500">
                            Solo completa si deseas cambiar la contraseña
                        </span>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="role">Rol</label>
                        <select
                            id="role"
                            name="role"
                            required
                            defaultValue={user.role}
                            className="p-2 border rounded text-black"
                            disabled={isCurrentUser}
                        >
                            <option value="ADMIN">Administrador</option>
                            <option value="TECHNICIAN">Técnico</option>
                            <option value="RECEPTIONIST">Recepcionista</option>
                        </select>
                        {isCurrentUser && (
                            <span className="text-sm text-amber-600">
                                No puedes cambiar tu propio rol
                            </span>
                        )}
                    </div>

                    <div aria-live="polite">
                        {updateState?.message && (
                            <p className="text-red-500 bg-red-50 p-2 rounded border border-red-200">
                                {updateState.message}
                            </p>
                        )}
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button
                            type="submit"
                            className={styles.createBtn}
                            disabled={isUpdating}
                        >
                            {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                        <Link
                            href="/dashboard/users"
                            className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
                        >
                            Cancelar
                        </Link>
                    </div>
                </form>
            </div>

            {/* Delete Section */}
            {!isCurrentUser && (
                <div className={styles.tableContainer} style={{ padding: '2rem', marginTop: '2rem', borderColor: '#fee2e2' }}>
                    <h2 className="text-lg font-semibold text-red-600 mb-4">Zona de Peligro</h2>

                    {!showDeleteConfirm ? (
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                            Eliminar Usuario
                        </button>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <p className="text-red-600">
                                ¿Estás seguro de que deseas eliminar a <strong>{user.name || user.email}</strong>?
                                Esta acción no se puede deshacer.
                            </p>

                            <form action={deleteAction}>
                                <input type="hidden" name="userId" value={user.id} />

                                {deleteState?.message && (
                                    <p className="text-red-500 bg-red-50 p-2 rounded border border-red-200 mb-4">
                                        {deleteState.message}
                                    </p>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Usuario'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
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
