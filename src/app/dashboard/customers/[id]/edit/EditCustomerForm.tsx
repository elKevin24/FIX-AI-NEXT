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
                <form action={updateAction} className={styles.form} style={{ maxWidth: '32rem' }}>
                    <input type="hidden" name="customerId" value={customer.id} />

                    <div className={styles.formGroup}>
                        <label htmlFor="name" className={styles.label}>Nombre *</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            defaultValue={customer.name}
                            placeholder="Nombre completo del cliente"
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="email" className={styles.label}>Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            defaultValue={customer.email || ''}
                            placeholder="cliente@ejemplo.com"
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="phone" className={styles.label}>Teléfono</label>
                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            defaultValue={customer.phone || ''}
                            placeholder="+52 555 123 4567"
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.gridTwoColumns}>
                        <div className={styles.formGroup}>
                            <label htmlFor="dpi" className={styles.label}>DPI (ID)</label>
                            <input
                                id="dpi"
                                name="dpi"
                                type="text"
                                defaultValue={customer.dpi || ''}
                                placeholder="1234 56789 0101"
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="nit" className={styles.label}>NIT (Tax ID)</label>
                            <input
                                id="nit"
                                name="nit"
                                type="text"
                                defaultValue={customer.nit || ''}
                                placeholder="123456-7"
                                className={styles.input}
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="address" className={styles.label}>Dirección</label>
                        <textarea
                            id="address"
                            name="address"
                            rows={2}
                            defaultValue={customer.address || ''}
                            placeholder="Calle, número, colonia, ciudad..."
                            className={styles.input}
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    <div className={styles.resultsInfo} style={{ backgroundColor: 'var(--color-bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-base)' }}>
                        <p>Tickets asociados: <strong>{customer._count.tickets}</strong></p>
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
                            href="/dashboard/customers"
                            className={styles.cancelBtn}
                            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                        >
                            Cancelar
                        </Link>
                    </div>
                </form>
            </div>

            {/* Delete Section - Solo para admins */}
            {isAdmin && (
                <div className={styles.dangerZone} style={{ marginTop: '2rem' }}>
                    <h2 className={styles.dangerTitle}>Zona de Peligro</h2>

                    {hasTickets ? (
                        <div className={styles.errorMessage} style={{ color: 'var(--color-warning-700)', backgroundColor: 'var(--color-warning-50)', borderColor: 'var(--color-warning-200)' }}>
                            No se puede eliminar este cliente porque tiene {customer._count.tickets} ticket(s) asociado(s).
                        </div>
                    ) : !showDeleteConfirm ? (
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className={styles.dangerBtn}
                        >
                            Eliminar Cliente
                        </button>
                    ) : (
                        <div className={styles.formGroup}>
                            <p style={{ color: 'var(--color-danger-600)' }}>
                                ¿Estás seguro de que deseas eliminar a <strong>{customer.name}</strong>?
                                Esta acción no se puede deshacer.
                            </p>

                            <form action={deleteAction}>
                                <input type="hidden" name="customerId" value={customer.id} />

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
                                        {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Cliente'}
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