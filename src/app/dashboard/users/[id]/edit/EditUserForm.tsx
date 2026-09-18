'use client';

import { useActionState, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateUser, deleteUser } from '@/lib/user-actions';
import { useToast } from '@/context/ToastContext';
import styles from '../../../tickets/tickets.module.css';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

import type { UserRole } from '@prisma/client';

interface User {
    id: string;
    name: string | null;
    email: string;
    role: UserRole;
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
    const router = useRouter();
    const { addToast } = useToast();
    const [updateState, updateAction, isUpdating] = useActionState(updateUser, { success: false, message: '' });
    const [deleteState, deleteAction, isDeleting] = useActionState(deleteUser, { success: false, message: '' });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const isCurrentUser = user.id === currentUserId;

    useEffect(() => {
        if (updateState?.success) {
            addToast('Usuario actualizado exitosamente', 'SUCCESS');
            router.push('/dashboard/users');
            router.refresh();
        }
    }, [updateState?.success, router, addToast]);

    useEffect(() => {
        if (deleteState?.success) {
            addToast('Usuario eliminado exitosamente', 'SUCCESS');
            router.push('/dashboard/users');
            router.refresh();
        }
    }, [deleteState?.success, router, addToast]);

    return (
        <div className={styles['container']}>
            <PageHeader
                title="Editar Usuario"
                subtitle={`Usuario: ${user.name || user.email}`}
                actions={
                    <Button as={Link} href="/dashboard/users" variant="secondary" size="sm" leftIcon={<span>←</span>}>
                        Volver a Usuarios
                    </Button>
                }
            />

            {isSuperAdmin && (
                <div className={styles['superAdminBadge']} style={{ width: 'fit-content', marginBottom: '1rem' }}>
                    Tenant: {user.tenant.name}
                </div>
            )}

            <div className={styles['tableContainer']} style={{ padding: '2rem' }}>
                <form action={updateAction} className={styles['form']} style={{ maxWidth: '32rem' }}>
                    <input type="hidden" name="userId" value={user.id} />

                    <div className={styles['formGroup']}>
                        <label htmlFor="name" className={styles['label']}>Nombre</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            defaultValue={user.name || ''}
                            placeholder="Nombre completo"
                            className={styles['input']}
                        />
                    </div>

                    <div className={styles['formGroup']}>
                        <label htmlFor="email" className={styles['label']}>Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            defaultValue={user.email}
                            placeholder="usuario@ejemplo.com"
                            className={styles['input']}
                        />
                    </div>

                    <div className={styles['formGroup']}>
                        <label htmlFor="password" className={styles['label']}>Nueva Contraseña (opcional)</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            minLength={6}
                            placeholder="Dejar vacío para mantener la actual"
                            className={styles['input']}
                        />
                        <span className={styles['textGray']} style={{ fontSize: '0.875rem' }}>
                            Solo completa si deseas cambiar la contraseña
                        </span>
                    </div>

                    <div className={styles['formGroup']}>
                        <label htmlFor="role" className={styles['label']}>Rol</label>
                        <select
                            id="role"
                            name="role"
                            required
                            defaultValue={user.role}
                            className={styles['input']}
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
                            <p className={styles['errorMessage']}>
                                {updateState.message}
                            </p>
                        )}
                    </div>

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
                            as={Link}
                            href="/dashboard/users"
                            variant="ghost"
                            size="sm"
                        >
                            Cancelar
                        </Button>
                    </div>
                </form>
            </div>

            {/* Delete Section */}
            {!isCurrentUser && (
                <div className={styles['dangerZone']} style={{ marginTop: '2rem' }}>
                    <h2 className={styles['dangerTitle']}>Zona de Peligro</h2>

                    {!showDeleteConfirm ? (
                        <Button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            variant="danger"
                            size="sm"
                        >
                            Eliminar Usuario
                        </Button>
                    ) : (
                        <div className={styles['formGroup']}>
                            <p style={{ color: 'var(--color-error-600)', margin: '0 0 1rem 0' }}>
                                ¿Estás seguro de que deseas eliminar a <strong>{user.name || user.email}</strong>? Esta acción no se puede deshacer.
                            </p>

                            <form action={deleteAction}>
                                <input type="hidden" name="userId" value={user.id} />

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
                                    >
                                        Sí, Eliminar Usuario
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(false)}
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
    );
}