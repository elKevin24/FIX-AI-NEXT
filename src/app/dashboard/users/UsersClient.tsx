'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { Badge, Button } from '@/components/ui';
import Link from 'next/link';
import DeleteUserButton from './DeleteUserButton';

interface UserData {
    id: string;
    name: string | null;
    email: string;
    role: string;
    createdAt: Date;
    _count?: {
        assignedTickets: number;
    };
}

export default function UsersClient({ data }: { data: UserData[] }) {
    const columns: ColumnDef<UserData>[] = [
        {
            accessorKey: 'name',
            header: 'Usuario',
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs">
                        {row.original.name?.[0] || row.original.email[0].toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-800">{row.original.name || 'Sin nombre'}</span>
                        <span className="text-xs text-gray-500 font-mono">{row.original.email}</span>
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'role',
            header: 'Rol',
            cell: ({ row }) => {
                const role = row.original.role;
                const variant = role === 'ADMIN' ? 'primary' : role === 'TECHNICIAN' ? 'blue' : 'gray';
                return <Badge variant={variant as any}>{role}</Badge>;
            },
        },
        {
            accessorKey: '_count.assignedTickets',
            header: 'Tickets Activos',
            cell: ({ row }) => row.original._count?.assignedTickets || 0,
        },
        {
            id: 'actions',
            header: 'Acciones',
            cell: ({ row }) => (
                <div className="flex gap-2 items-center">
                    <Link href={`/dashboard/users/${row.original.id}`}>
                        <Button variant="ghost" size="sm">Editar</Button>
                    </Link>
                    <DeleteUserButton userId={row.original.id} userName={row.original.name || row.original.email} />
                </div>
            ),
        },
    ];

    return <DataTable columns={columns} data={data} />;
}
