'use client';

import React, { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { Badge, Button } from '@/components/ui';
import Link from 'next/link';
import DeleteUserButton from './DeleteUserButton';
import { ROLE_LABELS, ROLE_COLORS, hasPermission, canModifyUser } from '@/lib/auth-utils';
import type { UserRole } from '@prisma/client';

interface UserData {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    name: string | null;
    role: UserRole;
    isActive: boolean;
    lastLoginAt: Date | null;
    passwordMustChange: boolean;
    createdAt: Date;
    _count?: {
        assignedTickets: number;
    };
}

interface UsersClientProps {
    data: UserData[];
    currentUserId: string;
    currentUserRole: UserRole;
}

export default function UsersClient({ data, currentUserId, currentUserRole }: UsersClientProps) {
    const [showInactive, setShowInactive] = useState(false);

    const filteredData = showInactive ? data : data.filter(u => u.isActive);

    const canEdit = hasPermission(currentUserRole, 'canEditUsers');
    const canDelete = hasPermission(currentUserRole, 'canDeleteUsers');

    const getDisplayName = (user: UserData): string => {
        if (user.firstName || user.lastName) {
            return `${user.firstName || ''} ${user.lastName || ''}`.trim();
        }
        return user.name || 'Sin nombre';
    };

    const getInitials = (user: UserData): string => {
        if (user.firstName && user.lastName) {
            return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
        }
        if (user.name) {
            const parts = user.name.split(' ');
            return parts.length > 1
                ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
                : user.name[0].toUpperCase();
        }
        return user.email[0].toUpperCase();
    };

    const columns: ColumnDef<UserData>[] = [
        {
            accessorKey: 'name',
            header: 'Usuario',
            cell: ({ row }) => {
                const user = row.original;
                const displayName = getDisplayName(user);
                const initials = getInitials(user);

                return (
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                            user.isActive
                                ? 'bg-primary-100 text-primary-700'
                                : 'bg-gray-200 text-gray-500'
                        }`}>
                            {initials}
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className={`font-bold ${user.isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                                    {displayName}
                                </span>
                                {!user.isActive && (
                                    <Badge variant="gray" className="text-xs">Inactivo</Badge>
                                )}
                                {user.passwordMustChange && user.isActive && (
                                    <Badge variant="warning" className="text-xs">Cambiar clave</Badge>
                                )}
                            </div>
                            <span className="text-xs text-gray-500 font-mono">{user.email}</span>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'role',
            header: 'Rol',
            cell: ({ row }) => {
                const role = row.original.role;
                const colors = ROLE_COLORS[role] || ROLE_COLORS.VIEWER;
                const label = ROLE_LABELS[role] || role;

                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                        {label}
                    </span>
                );
            },
            filterFn: (row, _columnId, filterValue) => {
                if (!filterValue || filterValue === 'ALL') return true;
                return row.original.role === filterValue;
            },
        },
        {
            accessorKey: 'isActive',
            header: 'Estado',
            cell: ({ row }) => (
                <Badge variant={row.original.isActive ? 'success' : 'gray'}>
                    {row.original.isActive ? 'Activo' : 'Inactivo'}
                </Badge>
            ),
        },
        {
            accessorKey: '_count.assignedTickets',
            header: 'Tickets',
            cell: ({ row }) => {
                const count = row.original._count?.assignedTickets || 0;
                return (
                    <span className={`font-medium ${count > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                        {count}
                    </span>
                );
            },
        },
        {
            accessorKey: 'lastLoginAt',
            header: 'Ultimo acceso',
            cell: ({ row }) => {
                const lastLogin = row.original.lastLoginAt;
                if (!lastLogin) {
                    return <span className="text-gray-400 text-sm">Nunca</span>;
                }
                const date = new Date(lastLogin);
                const now = new Date();
                const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

                let timeAgo: string;
                if (diffDays === 0) {
                    timeAgo = 'Hoy';
                } else if (diffDays === 1) {
                    timeAgo = 'Ayer';
                } else if (diffDays < 7) {
                    timeAgo = `Hace ${diffDays} días`;
                } else {
                    timeAgo = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                }

                return <span className="text-sm text-gray-600">{timeAgo}</span>;
            },
        },
        {
            id: 'actions',
            header: 'Acciones',
            cell: ({ row }) => {
                const user = row.original;
                const isSelf = user.id === currentUserId;
                const canModify = isSelf || canModifyUser(currentUserRole, user.role, isSelf);

                return (
                    <div className="flex gap-2 items-center">
                        {canEdit && canModify && (
                            <Link href={`/dashboard/users/${user.id}`}>
                                <Button variant="ghost" size="sm">Editar</Button>
                            </Link>
                        )}
                        {canDelete && !isSelf && canModify && (
                            <DeleteUserButton
                                userId={user.id}
                                userName={getDisplayName(user)}
                                isActive={user.isActive}
                            />
                        )}
                    </div>
                );
            },
        },
    ];

    const inactiveCount = data.filter(u => !u.isActive).length;

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                        {filteredData.length} usuario{filteredData.length !== 1 ? 's' : ''}
                    </span>
                    {inactiveCount > 0 && (
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showInactive}
                                onChange={(e) => setShowInactive(e.target.checked)}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-gray-600">
                                Mostrar inactivos ({inactiveCount})
                            </span>
                        </label>
                    )}
                </div>
            </div>

            {/* Data Table */}
            <DataTable columns={columns} data={filteredData} />
        </div>
    );
}
