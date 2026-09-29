'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { Badge, Button } from '@/components/ui';
import { TicketStatusBadge } from '@/components/tickets/TicketStatusBadge';
import Link from 'next/link';
import styles from './tickets.module.css';

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
                <span className={styles['ticketIdCell']} title={row.original.ticketNumber || row.original.id}>
                    {row.original.ticketNumber || row.original.id.slice(0, 8)}
                </span>
            ),
        },
        {
            accessorKey: 'title',
            header: 'Problema',
            cell: ({ row }) => (
                <div className={styles['ticketTitleCell']}>
                    <span className={styles['ticketTitleText']} title={row.original.title}>{row.original.title}</span>
                    <span className={styles['ticketDateText']}>
                        {new Date(row.original.createdAt).toLocaleDateString('es-ES')}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: 'customer.name',
            header: 'Cliente',
            cell: ({ row }) => (
                <Link href={`/dashboard/customers/${row.original.customer.id}`} className={styles['ticketCustomerLink']} title={row.original.customer.name}>
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
                if (priority === 'HIGH') color = 'warning';
                if (priority === 'URGENT') color = 'error';
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
            cell: ({ row }) => row.original.assignedTo?.name || row.original.assignedTo?.email || <span className={styles['unassignedText']}>Sin asignar</span>,
        },
        {
            id: 'actions',
            header: 'Acciones',
            cell: ({ row }) => (
                <div className="flex gap-2 items-center">
                    <Link href={`/dashboard/tickets/${row.original.id}`}>
                        <Button variant="ghost" size="sm">Detalle</Button>
                    </Link>
                </div>
            ),
        },
    ];

    return (
        <div>
            <DataTable columns={columns} data={data} />
        </div>
    );
}
