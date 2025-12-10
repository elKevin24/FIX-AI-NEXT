'use client';

import { useActionState } from 'react';
import { createPart } from '@/lib/actions';
import Link from 'next/link';
import styles from '../../tickets/tickets.module.css';

export default function CreatePartPage() {
    const [state, formAction, isPending] = useActionState(createPart, null);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Nuevo Repuesto</h1>
                <Link href="/dashboard/parts" className={styles.viewLink}>
                    ← Volver
                </Link>
            </div>

            <div className={styles.tableContainer} style={{ maxWidth: '600px', padding: '2rem' }}>
                <form action={formAction} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="name">Nombre del Repuesto *</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            placeholder="Ej: Pantalla LCD iPhone 13"
                            className="p-2 border rounded text-black"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="sku">SKU / Código (Opcional)</label>
                        <input
                            id="sku"
                            name="sku"
                            type="text"
                            placeholder="Ej: LCD-IP13-001"
                            className="p-2 border rounded text-black"
                        />
                        <p className="text-sm text-gray-600">
                            Código de identificación único del repuesto
                        </p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="quantity">Cantidad Inicial *</label>
                        <input
                            id="quantity"
                            name="quantity"
                            type="number"
                            required
                            min="0"
                            defaultValue="0"
                            className="p-2 border rounded text-black"
                        />
                        <p className="text-sm text-gray-600">
                            Cantidad actual en stock
                        </p>
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
                                placeholder="0.00"
                                className="p-2 border rounded text-black"
                            />
                            <p className="text-sm text-gray-600">
                                Precio de compra
                            </p>
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
                                placeholder="0.00"
                                className="p-2 border rounded text-black"
                            />
                            <p className="text-sm text-gray-600">
                                Precio para el cliente
                            </p>
                        </div>
                    </div>

                    {state?.message && (
                        <div className={`p-3 rounded ${state.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                            {state.message}
                        </div>
                    )}

                    <div className="flex gap-3 mt-4">
                        <button
                            type="submit"
                            className={styles.createBtn}
                            disabled={isPending}
                        >
                            {isPending ? 'Creando...' : 'Crear Repuesto'}
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
        </div>
    );
}
