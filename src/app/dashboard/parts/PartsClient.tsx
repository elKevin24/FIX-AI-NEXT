'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { Badge, Button } from '@/components/ui';
import Link from 'next/link';
import styles from './parts.module.css';

interface PartData {
    id: string;
    name: string;
    sku: string | null;
    quantity: number;
    minStock: number;
    price: number;
    cost: number;
}

export default function PartsClient({ data }: { data: PartData[] }) {
    const columns: ColumnDef<PartData>[] = [
        {
            accessorKey: 'name',
            header: 'Repuesto',
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-bold text-gray-800">{row.original.name}</span>
                    {row.original.sku && <span className="text-xs text-gray-500 font-mono">SKU: {row.original.sku}</span>}
                </div>
            ),
        },
        {
            accessorKey: 'quantity',
            header: 'Stock',
            cell: ({ row }) => {
                const isLow = row.original.quantity <= row.original.minStock;
                return (
                    <div className="flex items-center gap-2">
                        <span className={`font-bold ${isLow ? 'text-red-600' : 'text-gray-800'}`}>
                            {row.original.quantity}
                        </span>
                        {isLow && <Badge variant="error">Bajo</Badge>}
                    </div>
                );
            },
        },
        {
            accessorKey: 'price',
            header: 'Precio',
            cell: ({ row }) => `Q${Number(row.original.price).toFixed(2)}`,
        },
        {
            id: 'margin',
            header: 'Margen',
            cell: ({ row }) => {
                const margin = Number(row.original.price) - Number(row.original.cost);
                const percent = row.original.price > 0 ? (margin / Number(row.original.price)) * 100 : 0;
                return (
                    <span className={margin >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {percent.toFixed(0)}%
                    </span>
                );
            }
        },
        {
            id: 'actions',
            header: 'Acciones',
            cell: ({ row }) => (
                <div className="flex gap-2">
                    <Link href={`/dashboard/parts/${row.original.id}`}>
                        <Button variant="ghost" size="sm">Editar</Button>
                    </Link>
                </div>
            ),
        },
    ];

    return <DataTable columns={columns} data={data} />;
}
