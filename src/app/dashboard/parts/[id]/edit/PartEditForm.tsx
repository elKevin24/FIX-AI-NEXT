'use client';

import { useActionState, useState } from 'react';
import { updatePart, deletePart } from '@/lib/actions';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardBody, Button, Input, Alert } from '@/components/ui';
import { ArrowLeft, Package, AlertTriangle, Trash2, Info } from 'lucide-react';
import formStyles from '@/components/ui/Form.module.css';

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
        <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <PageHeader
                title="Editar Repuesto"
                subtitle={`Repuesto #${part.id.slice(0, 8)} - ${part.name}`}
                actions={
                    <Button as={Link} href="/dashboard/parts" variant="secondary" size="sm" leftIcon={<ArrowLeft size={16} aria-hidden="true" />}>
                        Volver a Repuestos
                    </Button>
                }
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
                {/* Main Form */}
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
                                <Package size={18} aria-hidden="true" />
                            </div>
                            <div>
                                <CardTitle>Información del Repuesto</CardTitle>
                                <CardDescription>Modifica el nombre, código SKU, stock y precios</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardBody>
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

                            <div className={formStyles['formRow']}>
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
                            </div>

                            <div className={formStyles['formRow']}>
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
                                <Alert variant={updateState.message.includes('éxito') || updateState.message.includes('correctamente') ? 'info' : 'error'}>
                                    {updateState.message}
                                </Alert>
                            )}

                            <div className={formStyles['actions']}>
                                <Button
                                    as={Link}
                                    href="/dashboard/parts"
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

                {/* Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Status Card */}
                    <Card>
                        <CardHeader>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '2rem',
                                    height: '2rem',
                                    borderRadius: 'var(--radius-md, 0.5rem)',
                                    background: 'var(--color-primary-50)',
                                    border: '1px solid var(--color-primary-200)',
                                    color: 'var(--color-primary-600)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <Info size={16} aria-hidden="true" />
                                </div>
                                <CardTitle style={{ fontSize: '1rem' }}>Resumen</CardTitle>
                            </div>
                        </CardHeader>
                        <CardBody>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>ID:</span>
                                    <code style={{ fontSize: '0.8rem', background: 'var(--color-bg-secondary, rgba(0,0,0,0.04))', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{part.id.slice(0, 8)}</code>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>Tenant:</span>
                                    <strong>{part.tenant.name}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>Estado Stock:</span>
                                    {part.quantity === 0 ? (
                                        <span style={{ color: 'var(--color-error-600)', fontWeight: 700 }}>Agotado</span>
                                    ) : part.quantity < 5 ? (
                                        <span style={{ color: 'var(--color-warning-600)', fontWeight: 700 }}>Stock Bajo ({part.quantity})</span>
                                    ) : (
                                        <span style={{ color: 'var(--color-success-600)', fontWeight: 700 }}>En Stock ({part.quantity})</span>
                                    )}
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Delete Section */}
                    {isAdmin && (
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
                                    <CardTitle style={{ color: 'var(--color-error-600)', fontSize: '1rem' }}>Zona de Peligro</CardTitle>
                                </div>
                            </CardHeader>
                            <CardBody>
                                {hasUsageRecords ? (
                                    <Alert variant="warning">
                                        ⚠️ Este repuesto tiene registros de uso en tickets y no puede ser eliminado.
                                    </Alert>
                                ) : !showDeleteConfirm ? (
                                    <Button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        disabled={hasUsageRecords}
                                        variant="danger"
                                        size="sm"
                                        leftIcon={<Trash2 size={15} aria-hidden="true" />}
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
                                                <Alert variant="error">{deleteState.message}</Alert>
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
                                                    variant="secondary"
                                                    size="sm"
                                                >
                                                    Cancelar
                                                </Button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

