'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { TicketStatusBadge } from '@/components/tickets/TicketStatusBadge';
import Link from 'next/link';
import styles from '@/app/dashboard/tickets/tickets.module.css';

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
                <Link href={`/dashboard/tickets/${row.original.id}`} className={styles['ticketCustomerLink']} style={{ fontFamily: 'var(--font-family-mono)' }}>
                    {row.original.ticketNumber || row.original.id.slice(0, 8)}
                </Link>
            ),
        },
        {
            accessorKey: 'title',
            header: 'Problema',
            cell: ({ row }) => <span style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>{row.original.title}</span>,
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
                <span className={styles['ticketDateText']} style={{ fontSize: 'var(--font-size-xs)' }}>
                    {row.original.assignedTo?.name || <span className={styles['unassignedText']}>Sin asignar</span>}
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
