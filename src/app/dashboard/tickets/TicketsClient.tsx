'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui';
import { TicketStatusBadge } from '@/components/tickets/TicketStatusBadge'; // Usaremos el componente existente si es posible
import Link from 'next/link';

interface TicketData {
    id: string;
    ticketNumber?: string | null;
    title: string;
    status: string;
    priority: string;
    createdAt: Date;
    updatedAt: Date;
    customer: {
        id: string;
        name: string;
    };
    assignedTo?: {
        name?: string | null;
        email?: string | null;
    } | null;
    tenant?: {
        name: string;
    };
}

interface TicketsClientProps {
    data: TicketData[];
    isSuperAdmin?: boolean;
}

export default function TicketsClient({ data, isSuperAdmin = false }: TicketsClientProps) {
    const columns: ColumnDef<TicketData>[] = [
        {
            accessorKey: 'id',
            header: 'ID',
            meta: { className: 'w-[100px] min-w-[100px]' },
            cell: ({ row }) => (
                <span className="font-mono text-xs text-gray-500 truncate block w-full max-w-[100px]" title={row.original.ticketNumber || row.original.id}>
                    {row.original.ticketNumber || row.original.id.slice(0, 8)}
                </span>
            ),
        },
        {
            accessorKey: 'title',
            header: 'Problema',
            meta: { className: 'min-w-[200px] w-full max-w-[400px] whitespace-normal' },
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-bold text-gray-800 line-clamp-2" title={row.original.title}>{row.original.title}</span>
                    <span className="text-xs text-gray-500 mt-1">
                        {new Date(row.original.createdAt).toLocaleDateString('es-ES')}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: 'customer.name',
            header: 'Cliente',
            meta: { className: 'min-w-[150px] max-w-[200px] whitespace-normal' },
            cell: ({ row }) => (
                <Link href={`/dashboard/customers/${row.original.customer.id}`} className="text-primary-600 hover:underline font-medium line-clamp-1" title={row.original.customer.name}>
                    {row.original.customer.name}
                </Link>
            ),
        },
        ...(isSuperAdmin ? [{
            accessorKey: 'tenant.name',
            header: 'Tenant',
            cell: ({ row }: any) => <Badge variant="gray">{row.original.tenant?.name}</Badge>
        }] : []),
        {
            accessorKey: 'status',
            header: 'Estado',
            meta: { className: 'w-[120px]' },
            cell: ({ row }) => <TicketStatusBadge status={row.original.status as any} />,
        },
        {
            accessorKey: 'priority',
            header: 'Prioridad',
            cell: ({ row }) => {
                const priority = row.original.priority;
                let color = 'gray';
                if (priority === 'HIGH') color = 'orange';
                if (priority === 'URGENT') color = 'red';
                return (
                    <Badge variant={color as any}>
                        {priority}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'assignedTo.name',
            header: 'Técnico',
            cell: ({ row }) => row.original.assignedTo?.name || row.original.assignedTo?.email || <span className="text-gray-400 italic">Sin asignar</span>,
        },
        {
            id: 'actions',
            header: 'Acciones',
            meta: { className: 'w-[120px] text-right pr-4' },
            cell: ({ row }) => (
                <Link 
                    href={`/dashboard/tickets/${row.original.id}`} 
                    className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors"
                >
                    Ver Detalles
                </Link>
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
