'use client';

import { useActionState } from 'react';
import { updateCustomer, deleteCustomer } from '@/lib/actions';
import styles from '../../../tickets/tickets.module.css';
import Link from 'next/link';
import { useState } from 'react';

interface Customer {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
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
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Editar Cliente</h1>
                <Link href="/dashboard/customers" className={styles.viewLink}>
                    &larr; Volver a clientes
                </Link>
            </div>

            {isSuperAdmin && (
                <div className={styles.superAdminBadge} style={{ width: 'fit-content', marginBottom: '1rem' }}>
                    Tenant: {customer.tenant.name}
                </div>
            )}

            <div className={styles.tableContainer} style={{ padding: '2rem' }}>
                <form action={updateAction} className="flex flex-col gap-4 max-w-lg">
                    <input type="hidden" name="customerId" value={customer.id} />

                    <div className="flex flex-col gap-2">
                        <label htmlFor="name">Nombre *</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            defaultValue={customer.name}
                            placeholder="Nombre completo del cliente"
                            className="p-2 border rounded text-black"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            defaultValue={customer.email || ''}
                            placeholder="cliente@ejemplo.com"
                            className="p-2 border rounded text-black"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="phone">Teléfono</label>
                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            defaultValue={customer.phone || ''}
                            placeholder="+52 555 123 4567"
                            className="p-2 border rounded text-black"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="address">Dirección</label>
                        <textarea
                            id="address"
                            name="address"
                            rows={2}
                            defaultValue={customer.address || ''}
                            placeholder="Calle, número, colonia, ciudad..."
                            className="p-2 border rounded text-black"
                        />
                    </div>

                    <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                        Tickets asociados: <strong>{customer._count.tickets}</strong>
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
                            href="/dashboard/customers"
                            className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
                        >
                            Cancelar
                        </Link>
                    </div>
                </form>
            </div>

            {/* Delete Section - Solo para admins */}
            {isAdmin && (
                <div className={styles.tableContainer} style={{ padding: '2rem', marginTop: '2rem', borderColor: '#fee2e2' }}>
                    <h2 className="text-lg font-semibold text-red-600 mb-4">Zona de Peligro</h2>

                    {hasTickets ? (
                        <div className="text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
                            No se puede eliminar este cliente porque tiene {customer._count.tickets} ticket(s) asociado(s).
                        </div>
                    ) : !showDeleteConfirm ? (
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                            Eliminar Cliente
                        </button>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <p className="text-red-600">
                                ¿Estás seguro de que deseas eliminar a <strong>{customer.name}</strong>?
                                Esta acción no se puede deshacer.
                            </p>

                            <form action={deleteAction}>
                                <input type="hidden" name="customerId" value={customer.id} />

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
                                        {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Cliente'}
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
