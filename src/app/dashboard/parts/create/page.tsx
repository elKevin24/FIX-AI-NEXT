'use client';

import { useActionState } from 'react';
import { createPart } from '@/lib/actions';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardBody, Button, Input, Alert } from '@/components/ui';
import { ArrowLeft, PackagePlus } from 'lucide-react';
import formStyles from '@/components/ui/Form.module.css';

export default function CreatePartPage() {
    const [state, formAction, isPending] = useActionState(createPart, null);

    return (
        <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <PageHeader
                title="Nuevo Repuesto"
                subtitle="Registra una nueva pieza o repuesto en el inventario del taller"
                actions={
                    <Button as={Link} href="/dashboard/parts" variant="secondary" size="sm" leftIcon={<ArrowLeft size={16} aria-hidden="true" />}>
                        Volver a Repuestos
                    </Button>
                }
            />

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
                            <PackagePlus size={18} aria-hidden="true" />
                        </div>
                        <div>
                            <CardTitle>Detalles del Repuesto</CardTitle>
                            <CardDescription>Ingresa la información básica, stock inicial y precios</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardBody>
                    <form action={formAction} className="flex flex-col gap-4">
                        <Input
                            id="name"
                            name="name"
                            label="Nombre del Repuesto *"
                            type="text"
                            required
                            placeholder="Ej: Pantalla LCD iPhone 13"
                        />

                        <div className={formStyles['formRow']}>
                            <Input
                                id="sku"
                                name="sku"
                                label="SKU / Código (Opcional)"
                                type="text"
                                placeholder="Ej: LCD-IP13-001"
                                helper="Código de identificación único"
                            />

                            <Input
                                id="quantity"
                                name="quantity"
                                label="Cantidad Inicial *"
                                type="number"
                                required
                                min="0"
                                defaultValue="0"
                                helper="Cantidad actual en stock"
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
                                placeholder="0.00"
                                helper="Precio de compra"
                            />

                            <Input
                                id="price"
                                name="price"
                                label="Precio Venta (USD) *"
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                helper="Precio para el cliente"
                            />
                        </div>

                        {state?.message && (
                            <Alert variant={state.message.includes('éxito') || state.message.includes('correctamente') ? 'info' : 'error'}>
                                {state.message}
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
                                isLoading={isPending}
                            >
                                Crear Repuesto
                            </Button>
                        </div>
                    </form>
                </CardBody>
            </Card>
        </div>
    );
}

