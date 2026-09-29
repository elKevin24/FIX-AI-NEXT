'use client';

import { useActionState } from 'react';
import { updateCustomer, deleteCustomer } from '@/lib/actions';
import PageHeader from '@/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardBody, Button, Input, Textarea, Alert } from '@/components/ui';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, User, AlertTriangle, Trash2 } from 'lucide-react';
import formStyles from '@/components/ui/Form.module.css';

interface Customer {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    dpi: string | null;
    nit: string | null;
    tenantId: string;
    tenant: {
        name: string;
    };
    _count: {
        tickets: number;
    };
}

interface Props {
    customer: Customer;
    isSuperAdmin: boolean;
    isAdmin: boolean;
}

export default function EditCustomerForm({ customer, isSuperAdmin, isAdmin }: Props) {
    const [updateState, updateAction, isUpdating] = useActionState(updateCustomer, null);
    const [deleteState, deleteAction, isDeleting] = useActionState(deleteCustomer, null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const hasTickets = customer._count.tickets > 0;

    return (
        <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <PageHeader
                title="Editar Cliente"
                subtitle={`Registro de cliente: ${customer.name}`}
                actions={
                    <Button as={Link} href="/dashboard/customers" variant="secondary" size="sm" leftIcon={<ArrowLeft size={16} aria-hidden="true" />}>
                        Volver a Clientes
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
                    Tenant: {customer.tenant.name}
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
                            <CardTitle>Datos del Cliente</CardTitle>
                            <CardDescription>Actualiza los datos personales y fiscales del cliente</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardBody>
                    <form action={updateAction} className="flex flex-col gap-4">
                        <input type="hidden" name="customerId" value={customer.id} />

                        <Input
                            label="Nombre Completo *"
                            id="name"
                            name="name"
                            type="text"
                            required
                            defaultValue={customer.name}
                            placeholder="Nombre completo del cliente"
                        />

                        <div className={formStyles['formRow']}>
                            <Input
                                label="📧 Correo Electrónico"
                                id="email"
                                name="email"
                                type="email"
                                defaultValue={customer.email || ''}
                                placeholder="cliente@ejemplo.com"
                            />

                            <Input
                                label="📱 Teléfono"
                                id="phone"
                                name="phone"
                                type="tel"
                                defaultValue={customer.phone || ''}
                                placeholder="+502 5555-1234"
                            />
                        </div>

                        <div className={formStyles['formRow']}>
                            <Input
                                label="🆔 DPI (Identificación)"
                                id="dpi"
                                name="dpi"
                                type="text"
                                defaultValue={customer.dpi || ''}
                                placeholder="1234 56789 0101"
                            />
                            <Input
                                label="📄 NIT (Tributario)"
                                id="nit"
                                name="nit"
                                type="text"
                                defaultValue={customer.nit || ''}
                                placeholder="123456-7"
                            />
                        </div>

                        <Textarea
                            label="📍 Dirección"
                            id="address"
                            name="address"
                            rows={2}
                            defaultValue={customer.address || ''}
                            placeholder="Calle, número, colonia, ciudad..."
                        />

                        <div style={{
                            backgroundColor: 'var(--color-bg-secondary, rgba(0,0,0,0.02))',
                            padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md, 0.5rem)',
                            border: '1px solid var(--color-border-light)',
                            fontSize: '0.875rem'
                        }}>
                            <span>Tickets asociados: </span>
                            <strong style={{ color: 'var(--color-primary-600)' }}>{customer._count.tickets}</strong>
                        </div>

                        {updateState?.message && (
                            <Alert variant={updateState.message.includes('éxito') || updateState.message.includes('correctamente') ? 'info' : 'error'}>
                                {updateState.message}
                            </Alert>
                        )}

                        <div className={formStyles['actions']}>
                            <Button
                                as={Link}
                                href="/dashboard/customers"
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

            {/* Danger Zone */}
            {isAdmin && (
                <Card style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                    <CardHeader>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                width: '2.25rem',
                                height: '2.25rem',
                                borderRadius: 'var(--radius-lg, 0.75rem)',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                color: 'var(--color-error-600)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <AlertTriangle size={18} aria-hidden="true" />
                            </div>
                            <div>
                                <CardTitle style={{ color: 'var(--color-error-600)' }}>Zona de Peligro</CardTitle>
                                <CardDescription>Acciones irreversibles sobre este cliente</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardBody>
                        {hasTickets ? (
                            <Alert variant="warning">
                                ⚠️ No se puede eliminar este cliente porque tiene {customer._count.tickets} ticket(s) asociado(s).
                            </Alert>
                        ) : !showDeleteConfirm ? (
                            <Button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                variant="danger"
                                size="sm"
                                leftIcon={<Trash2 size={15} aria-hidden="true" />}
                            >
                                Eliminar Cliente
                            </Button>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <p style={{ color: 'var(--color-error-600)', margin: 0, fontSize: '0.875rem' }}>
                                    ¿Estás seguro de que deseas eliminar a <strong>{customer.name}</strong>? Esta acción no se puede deshacer.
                                </p>

                                <form action={deleteAction} className="flex gap-3">
                                    <input type="hidden" name="customerId" value={customer.id} />

                                    {deleteState?.message && (
                                        <Alert variant="error">{deleteState.message}</Alert>
                                    )}

                                    <Button
                                        type="submit"
                                        variant="danger"
                                        size="sm"
                                        isLoading={isDeleting}
                                    >
                                        Sí, Eliminar Cliente
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