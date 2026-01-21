'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { Badge, Button } from '@/components/ui';
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
            cell: ({ row }) => (
                <span className="font-mono text-xs text-gray-500">
                    {row.original.ticketNumber || row.original.id.slice(0, 8)}
                </span>
            ),
        },
        {
            accessorKey: 'title',
            header: 'Problema',
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-bold text-gray-800">{row.original.title}</span>
                    <span className="text-xs text-gray-500">
                        {new Date(row.original.createdAt).toLocaleDateString('es-ES')}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: 'customer.name',
            header: 'Cliente',
            cell: ({ row }) => (
                <Link href={`/dashboard/customers/${row.original.customer.id}`} className="text-primary-600 hover:underline font-medium">
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
            cell: ({ row }) => (
                <Link href={`/dashboard/tickets/${row.original.id}`}>
                    <Button variant="ghost" size="sm">Ver Detalles</Button>
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
