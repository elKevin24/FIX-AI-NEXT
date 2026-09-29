'use client';

import { useActionState, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateUser, deleteUser } from '@/lib/user-actions';
import { useToast } from '@/context/ToastContext';
import PageHeader from '@/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardBody, Button, Input, Select, Alert } from '@/components/ui';
import Link from 'next/link';
import { ArrowLeft, User, AlertTriangle, Trash2 } from 'lucide-react';
import formStyles from '@/components/ui/Form.module.css';
import { ROLE_LABELS, getSelectableRoles } from '@/lib/auth-utils';
import type { UserRole } from '@prisma/client';

interface UserData {
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
    user: UserData;
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

    const roleOptions = getSelectableRoles().map((role) => ({
        value: role,
        label: ROLE_LABELS[role] || role,
    }));

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
        <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <PageHeader
                title="Editar Usuario"
                subtitle={`Usuario: ${user.name || user.email}`}
                actions={
                    <Button as={Link} href="/dashboard/users" variant="secondary" size="sm" leftIcon={<ArrowLeft size={16} aria-hidden="true" />}>
                        Volver a Usuarios
                    </Button>
                }
            />

            {isSuperAdmin && (
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.25rem 0.75rem',
                    background: 'var(--color-primary-50)',
                    border: '1px solid var(--color-primary-200)',
                    borderRadius: 'var(--radius-full, 9999px)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--color-primary-700)',
                    width: 'fit-content'
                }}>
                    Tenant: {user.tenant.name}
                </div>
            )}

            <Card>
                <CardHeader>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '2.25rem',
                            height: '2.25rem',
                            borderRadius: 'var(--radius-lg, 0.75rem)',
                            background: 'var(--color-primary-50)',
                            border: '1px solid var(--color-primary-200)',
                            color: 'var(--color-primary-600)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <User size={18} aria-hidden="true" />
                        </div>
                        <div>
                            <CardTitle>Información del Usuario</CardTitle>
                            <CardDescription>Actualiza el nombre, correo electrónico, rol o restablece la contraseña</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardBody>
                    <form action={updateAction} className="flex flex-col gap-4">
                        <input type="hidden" name="userId" value={user.id} />

                        <Input
                            id="name"
                            name="name"
                            label="Nombre Completo *"
                            type="text"
                            required
                            defaultValue={user.name || ''}
                            placeholder="Nombre completo"
                        />

                        <Input
                            id="email"
                            name="email"
                            label="Correo Electrónico *"
                            type="email"
                            required
                            defaultValue={user.email}
                            placeholder="usuario@ejemplo.com"
                        />

                        <Input
                            id="password"
                            name="password"
                            label="Nueva Contraseña (opcional)"
                            type="password"
                            minLength={6}
                            placeholder="Dejar vacío para mantener la actual"
                            helper="Solo completa este campo si deseas cambiar la contraseña del usuario"
                        />

                        <Select
                            id="role"
                            name="role"
                            label="Rol en el Sistema"
                            defaultValue={user.role}
                            options={roleOptions}
                            disabled={isCurrentUser}
                            helper={isCurrentUser ? 'No puedes modificar tu propio rol de acceso' : 'Define el nivel de permisos en la plataforma'}
                        />

                        {updateState?.message && !updateState.success && (
                            <Alert variant="error">
                                {updateState.message}
                            </Alert>
                        )}

                        <div className={formStyles['actions']}>
                            <Button
                                as={Link}
                                href="/dashboard/users"
                                variant="secondary"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                isLoading={isUpdating}
                            >
                                Guardar Cambios
                            </Button>
                        </div>
                    </form>
                </CardBody>
            </Card>

            {/* Delete Section */}
            {!isCurrentUser && (
                <Card style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                    <CardHeader>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                width: '2rem',
                                height: '2rem',
                                borderRadius: 'var(--radius-md, 0.5rem)',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                color: 'var(--color-error-600)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <AlertTriangle size={16} aria-hidden="true" />
                            </div>
                            <div>
                                <CardTitle style={{ color: 'var(--color-error-600)', fontSize: '1rem' }}>Zona de Peligro</CardTitle>
                                <CardDescription>Eliminar permanentemente este usuario</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardBody>
                        {!showDeleteConfirm ? (
                            <Button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                variant="danger"
                                size="sm"
                                leftIcon={<Trash2 size={15} aria-hidden="true" />}
                            >
                                Eliminar Usuario
                            </Button>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <p style={{ color: 'var(--color-error-600)', fontSize: '0.875rem', margin: 0 }}>
                                    ¿Estás seguro de que deseas eliminar a <strong>{user.name || user.email}</strong>? Esta acción no se puede deshacer.
                                </p>

                                <form action={deleteAction} className="flex gap-3">
                                    <input type="hidden" name="userId" value={user.id} />

                                    {deleteState?.message && !deleteState.success && (
                                        <Alert variant="error">{deleteState.message}</Alert>
                                    )}

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
                                        variant="secondary"
                                        size="sm"
                                    >
                                        Cancelar
                                    </Button>
                                </form>
                            </div>
                        )}
                    </CardBody>
                </Card>
            )}
        </div>
    );
}