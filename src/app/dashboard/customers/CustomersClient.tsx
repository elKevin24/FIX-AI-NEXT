'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, EmptyState, Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import Link from 'next/link';
import DeleteCustomerButton from './DeleteCustomerButton';

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

function CustomerIcon() {
    return (
        <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
    );
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

    if (data.length === 0) {
        return (
            <EmptyState
                icon={<CustomerIcon />}
                title="No hay clientes registrados"
                description="Aún no se han agregado clientes. Registra el primero para comenzar a asociar tickets."
                action={
                    <Link href="/dashboard/customers/create">
                        <Button variant="primary">Agregar Cliente</Button>
                    </Link>
                }
            />
        );
    }

    return (
        <DataTable 
            columns={columns} 
            data={data} 
        />
    );
}
