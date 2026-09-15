'use client';

import { useActionState } from 'react';
import { createPart } from '@/lib/actions';
import Link from 'next/link';
import styles from '../../tickets/tickets.module.css';
import PageHeader from '@/components/PageHeader';
import { Button, Input } from '@/components/ui';

export default function CreatePartPage() {
    const [state, formAction, isPending] = useActionState(createPart, null);

    return (
        <div className={styles['container']}>
            <PageHeader
                title="Nuevo Repuesto"
                subtitle="Registra una nueva pieza o repuesto en el inventario del taller"
                actions={
                    <Button as={Link} href="/dashboard/parts" variant="secondary" size="sm" leftIcon={<span>←</span>}>
                        Volver a Repuestos
                    </Button>
                }
            />

            <div className={styles['tableContainer']} style={{ maxWidth: '600px', padding: '2rem' }}>
                <form action={formAction} className="flex flex-col gap-4">
                    <Input
                        id="name"
                        name="name"
                        label="Nombre del Repuesto *"
                        type="text"
                        required
                        placeholder="Ej: Pantalla LCD iPhone 13"
                    />

                    <Input
                        id="sku"
                        name="sku"
                        label="SKU / Código (Opcional)"
                        type="text"
                        placeholder="Ej: LCD-IP13-001"
                        helper="Código de identificación único del repuesto"
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                        <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700">
                            {state.message}
                        </div>
                    )}

                    <div className="flex gap-3 mt-4">
                        <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            isLoading={isPending}
                        >
                            Crear Repuesto
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
        </div>
    );
}
