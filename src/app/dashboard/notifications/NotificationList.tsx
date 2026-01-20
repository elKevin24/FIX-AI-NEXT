'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { markMyNotificationAsRead, deleteMyNotification, markAllMyNotificationsAsRead } from '@/lib/notifications';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    link?: string | null;
    createdAt: Date;
}

interface Props {
    initialNotifications: Notification[];
    totalPages: number;
    currentPage: number;
}

export default function NotificationList({ initialNotifications, totalPages, currentPage }: Props) {
    const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleMarkAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        await markMyNotificationAsRead(id);
        router.refresh();
    };

    const handleDelete = async (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        await deleteMyNotification(id);
        router.refresh();
    };

    const handleMarkAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        await markAllMyNotificationsAsRead();
        router.refresh();
    };

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span className="text-gray-500 text-sm">Mostrando página {currentPage} de {totalPages || 1}</span>
                <button 
                    onClick={handleMarkAllRead}
                    disabled={isPending || notifications.every(n => n.isRead)}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 disabled:opacity-50"
                >
                    Marcar todas como leídas
                </button>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No tienes notificaciones.
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <div 
                            key={notification.id} 
                            className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!notification.isRead ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                        >
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`font-semibold ${getNotificationColor(notification.type)}`}>
                                            {notification.title}
                                        </span>
                                        {!notification.isRead && (
                                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-200">
                                                Nueva
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 mb-2">{notification.message}</p>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span>{new Date(notification.createdAt).toLocaleString()}</span>
                                        {notification.link && (
                                            <Link href={notification.link} className="text-blue-600 hover:underline">
                                                Ver detalles
                                            </Link>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {!notification.isRead && (
                                        <button 
                                            onClick={() => handleMarkAsRead(notification.id)}
                                            className="text-gray-400 hover:text-blue-600"
                                            title="Marcar como leída"
                                        >
                                            <CheckIcon />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleDelete(notification.id)}
                                        className="text-gray-400 hover:text-red-600"
                                        title="Eliminar"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-center gap-2">
                    <Link 
                        href={`/dashboard/notifications?page=${Math.max(1, currentPage - 1)}`}
                        className={`px-3 py-1 rounded border ${currentPage === 1 ? 'pointer-events-none opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        Anterior
                    </Link>
                    <Link 
                        href={`/dashboard/notifications?page=${Math.min(totalPages, currentPage + 1)}`}
                        className={`px-3 py-1 rounded border ${currentPage === totalPages ? 'pointer-events-none opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        Siguiente
                    </Link>
                </div>
            )}
        </div>
    );
}

function getNotificationColor(type: string) {
    switch (type) {
        case 'WARNING': return 'text-orange-600 dark:text-orange-400';
        case 'ERROR': return 'text-red-600 dark:text-red-400';
        case 'SUCCESS': return 'text-green-600 dark:text-green-400';
        default: return 'text-blue-600 dark:text-blue-400';
    }
}

function CheckIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    )
}

function TrashIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
    )
}
