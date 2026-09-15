'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { Badge, Button } from '@/components/ui';
import Link from 'next/link';
import DeleteCustomerButton from './DeleteCustomerButton';
import styles from './customers.module.css';

interface CustomerData {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    dpi: string | null;
    nit: string | null;
    createdAt: Date;
    _count: {
        tickets: number;
    };
}

interface CustomersClientProps {
    data: CustomerData[];
    isAdmin: boolean;
}

export default function CustomersClient({ data, isAdmin }: CustomersClientProps) {
    const columns: ColumnDef<CustomerData>[] = [
        {
            accessorKey: 'name',
            header: 'Cliente',
            cell: ({ row }) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-gray-800)' }}>{row.original.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{row.original.email || 'Sin email'}</span>
                </div>
            ),
        },
        {
            accessorKey: 'phone',
            header: 'Contacto',
            cell: ({ row }) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span>{row.original.phone || '-'}</span>
                    {row.original.nit && <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>NIT: {row.original.nit}</span>}
                </div>
            ),
        },
        {
            accessorKey: '_count.tickets',
            header: 'Tickets',
            cell: ({ row }) => (
                <Badge variant={row.original._count.tickets > 0 ? 'primary' : 'gray'}>
                    {row.original._count.tickets}
                </Badge>
            ),
        },
        {
            accessorKey: 'createdAt',
            header: 'Registro',
            cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString('es-ES'),
        },
        {
            id: 'actions',
            header: 'Acciones',
            cell: ({ row }) => (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Link href={`/dashboard/customers/${row.original.id}`}>
                        <Button variant="ghost" size="sm">Ver</Button>
                    </Link>
                    <Link href={`/dashboard/customers/${row.original.id}/edit`}>
                        <Button variant="secondary" size="sm">Editar</Button>
                    </Link>
                    {isAdmin && row.original._count.tickets === 0 && (
                        <DeleteCustomerButton 
                            customerId={row.original.id} 
                            customerName={row.original.name} 
                        />
                    )}
                </div>
            ),
        },
    ];

    return (
        <DataTable 
            columns={columns} 
            data={data} 
        />
    );
}
