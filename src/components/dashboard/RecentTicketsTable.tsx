'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui';
import { TicketStatusBadge } from '@/components/tickets/TicketStatusBadge';
import Link from 'next/link';

interface RecentTicket {
    id: string;
    ticketNumber?: string | null;
    title: string;
    status: string;
    createdAt: Date;
    customer: {
        name: string;
    };
    assignedTo?: {
        name?: string | null;
        email?: string | null;
    } | null;
    createdBy?: {
        name?: string | null;
        email?: string | null;
    } | null;
    updatedBy?: {
        name?: string | null;
        email?: string | null;
    } | null;
}

export default function RecentTicketsTable({ data }: { data: RecentTicket[] }) {
    const columns: ColumnDef<RecentTicket>[] = [
        {
            accessorKey: 'id',
            header: 'ID',
            cell: ({ row }) => (
                <Link href={`/dashboard/tickets/${row.original.id}`} className="font-mono text-primary-600 hover:underline">
                    {row.original.ticketNumber || row.original.id.slice(0, 8)}
                </Link>
            ),
        },
        {
            accessorKey: 'title',
            header: 'Problema',
            cell: ({ row }) => <span className="font-medium text-gray-800">{row.original.title}</span>,
        },
        {
            accessorKey: 'customer.name',
            header: 'Cliente',
            cell: ({ row }) => row.original.customer.name,
        },
        {
            accessorKey: 'status',
            header: 'Estado',
            cell: ({ row }) => <TicketStatusBadge status={row.original.status as any} />,
        },
        {
            accessorKey: 'assignedTo.name',
            header: 'Técnico',
            cell: ({ row }) => (
                <span className="text-xs text-gray-600">
                    {row.original.assignedTo?.name || 'Sin asignar'}
                </span>
            ),
        },
        {
            accessorKey: 'createdAt',
            header: 'Fecha',
            cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString('es-ES'),
        },
    ];

    return (
        <DataTable 
            columns={columns} 
            data={data} 
        />
    );
}
