'use client';

import { useActionState, useState } from 'react';
import { updatePart, deletePart } from '@/lib/actions';
import Link from 'next/link';
import styles from '../../../tickets/tickets.module.css';

interface Part {
    id: string;
    name: string;
    sku: string | null;
    quantity: number;
    cost: any;
    price: any;
    tenant: {
        id: string;
        name: string;
    };
}

interface Props {
    part: Part;
    isAdmin: boolean;
    hasUsageRecords: boolean;
}

export default function PartEditForm({ part, isAdmin, hasUsageRecords }: Props) {
    const [updateState, updateAction, isUpdating] = useActionState(updatePart, null);
    const [deleteState, deleteAction, isDeleting] = useActionState(deletePart, null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Editar Repuesto</h1>
                <Link href="/dashboard/parts" className={styles.viewLink}>
                    ← Volver
                </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                {/* Main Form */}
                <div className={styles.tableContainer} style={{ padding: '2rem' }}>
                    <form action={updateAction} className="flex flex-col gap-4">
                        <input type="hidden" name="partId" value={part.id} />

                        <div className="flex flex-col gap-2">
                            <label htmlFor="name">Nombre del Repuesto *</label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                required
                                defaultValue={part.name}
                                className="p-2 border rounded text-black"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="sku">SKU / Código</label>
                            <input
                                id="sku"
                                name="sku"
                                type="text"
                                defaultValue={part.sku || ''}
                                className="p-2 border rounded text-black"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="quantity">Cantidad en Stock *</label>
                            <input
                                id="quantity"
                                name="quantity"
                                type="number"
                                required
                                min="0"
                                defaultValue={part.quantity}
                                className="p-2 border rounded text-black"
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="flex flex-col gap-2">
                                <label htmlFor="cost">Costo (USD) *</label>
                                <input
                                    id="cost"
                                    name="cost"
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    defaultValue={Number(part.cost)}
                                    className="p-2 border rounded text-black"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="price">Precio Venta (USD) *</label>
                                <input
                                    id="price"
                                    name="price"
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    defaultValue={Number(part.price)}
                                    className="p-2 border rounded text-black"
                                />
                            </div>
                        </div>

                        {updateState?.message && (
                            <div className={`p-3 rounded ${updateState.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                                {updateState.message}
                            </div>
                        )}

                        <div className="flex gap-3 mt-4">
                            <button
                                type="submit"
                                className={styles.createBtn}
                                disabled={isUpdating}
                            >
                                {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                            <Link
                                href="/dashboard/parts"
                                className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
                            >
                                Cancelar
                            </Link>
                        </div>
                    </form>
                </div>

                {/* Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Info Card */}
                    <div className={styles.tableContainer} style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Información</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                            <div>
                                <span style={{ color: '#666' }}>Tenant:</span>{' '}
                                {part.tenant.name}
                            </div>
                            <div>
                                <span style={{ color: '#666' }}>Margen:</span>{' '}
                                <span style={{
                                    color: Number(part.price) > Number(part.cost) ? '#10b981' : '#dc2626'
                                }}>
                                    {Number(part.cost) > 0
                                        ? `${((Number(part.price) - Number(part.cost)) / Number(part.cost) * 100).toFixed(1)}%`
                                        : 'N/A'
                                    }
                                </span>
                            </div>
                            <div>
                                <span style={{ color: '#666' }}>Valor Total:</span>{' '}
                                ${(Number(part.price) * part.quantity).toFixed(2)}
                            </div>
                        </div>
                    </div>

                    {/* Delete Zone - Only for admins */}
                    {isAdmin && (
                        <div className={styles.tableContainer} style={{ padding: '1.5rem', borderColor: '#fee2e2' }}>
                            <h3 style={{ color: '#dc2626', marginBottom: '1rem' }}>Zona de Peligro</h3>

                            {hasUsageRecords && (
                                <p className="text-sm text-gray-600 mb-3">
                                    Este repuesto tiene registros de uso y no puede ser eliminado.
                                </p>
                            )}

                            {!showDeleteConfirm ? (
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    disabled={hasUsageRecords}
                                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Eliminar Repuesto
                                </button>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <p className="text-red-600 text-sm">
                                        ¿Eliminar este repuesto? Esta acción no se puede deshacer.
                                    </p>

                                    <form action={deleteAction}>
                                        <input type="hidden" name="partId" value={part.id} />

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
        </div>
    );
}
