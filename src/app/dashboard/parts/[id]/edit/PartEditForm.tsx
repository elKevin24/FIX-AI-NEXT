'use client';

import { useActionState, useState } from 'react';
import { updatePart, deletePart } from '@/lib/actions';
import Link from 'next/link';
import styles from '../../../tickets/tickets.module.css';
import PageHeader from '@/components/PageHeader';
import { Button, Input } from '@/components/ui';

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
        <div className={styles['container']}>
            <PageHeader
                title="Editar Repuesto"
                subtitle={`Repuesto #${part.id.slice(0, 8)}`}
                actions={
                    <Button as={Link} href="/dashboard/parts" variant="secondary" size="sm" leftIcon={<span>←</span>}>
                        Volver a Repuestos
                    </Button>
                }
            />

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                {/* Main Form */}
                <div className={styles['tableContainer']} style={{ padding: '2rem' }}>
                    <form action={updateAction} className="flex flex-col gap-4">
                        <input type="hidden" name="partId" value={part.id} />

                        <Input
                            id="name"
                            name="name"
                            label="Nombre del Repuesto *"
                            type="text"
                            required
                            defaultValue={part.name}
                        />

                        <Input
                            id="sku"
                            name="sku"
                            label="SKU / Código"
                            type="text"
                            defaultValue={part.sku || ''}
                        />

                        <Input
                            id="quantity"
                            name="quantity"
                            label="Cantidad en Stock *"
                            type="number"
                            required
                            min="0"
                            defaultValue={part.quantity}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <Input
                                id="cost"
                                name="cost"
                                label="Costo (USD) *"
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                defaultValue={Number(part.cost)}
                            />

                            <Input
                                id="price"
                                name="price"
                                label="Precio Venta (USD) *"
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                defaultValue={Number(part.price)}
                            />
                        </div>

                        {updateState?.message && (
                            <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700">
                                {updateState.message}
                            </div>
                        )}

                        <div className="flex gap-3 mt-4">
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
                                href="/dashboard/parts"
                                variant="ghost"
                                size="sm"
                            >
                                Cancelar
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Status Card */}
                    <div className={styles['tableContainer']} style={{ padding: '1.5rem' }}>
                        <h3 className={styles['label']} style={{ marginBottom: '1rem' }}>Información</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                            <div>
                                <span className={styles['textMuted']}>ID:</span>{' '}
                                <code style={{ fontSize: '0.8rem', background: 'var(--color-bg-secondary)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{part.id.slice(0, 8)}</code>
                            </div>
                            <div>
                                <span className={styles['textMuted']}>Tenant:</span>{' '}
                                <strong>{part.tenant.name}</strong>
                            </div>
                            <div>
                                <span className={styles['textMuted']}>Estado de Stock:</span>{' '}
                                {part.quantity === 0 ? (
                                    <span style={{ color: 'var(--color-error-600)', fontWeight: 600 }}>Agotado</span>
                                ) : part.quantity < 5 ? (
                                    <span style={{ color: 'var(--color-warning-600)', fontWeight: 600 }}>Stock Bajo</span>
                                ) : (
                                    <span style={{ color: 'var(--color-success-600)', fontWeight: 600 }}>En Stock</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Delete Section */}
                    {isAdmin && (
                        <div className={styles['dangerZone']} style={{ marginTop: 0 }}>
                            <h3 className={styles['dangerTitle']}>Zona de Peligro</h3>

                            {hasUsageRecords && (
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-warning-800)', marginBottom: '0.75rem' }}>
                                    ⚠️ Este repuesto tiene registros de uso en tickets y no puede ser eliminado.
                                </p>
                            )}

                            {!showDeleteConfirm ? (
                                <Button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    disabled={hasUsageRecords}
                                    variant="danger"
                                    size="sm"
                                    fullWidth
                                >
                                    Eliminar Repuesto
                                </Button>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <p style={{ color: 'var(--color-error-600)', fontSize: '0.875rem', margin: 0 }}>
                                        ¿Eliminar este repuesto? Esta acción no se puede deshacer.
                                    </p>

                                    <form action={deleteAction}>
                                        <input type="hidden" name="partId" value={part.id} />

                                        {deleteState?.message && (
                                            <p className={styles['errorMessage']} style={{ margin: '0.5rem 0' }}>
                                                {deleteState.message}
                                            </p>
                                        )}

                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <Button
                                                type="submit"
                                                variant="danger"
                                                size="sm"
                                                isLoading={isDeleting}
                                            >
                                                Confirmar
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
            </div>
        </div>
    );
}
