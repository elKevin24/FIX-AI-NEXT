'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { markMyNotificationAsRead, deleteMyNotification, markAllMyNotificationsAsRead } from '@/lib/notifications';
import styles from './notifications.module.css';

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
        <div className={styles.container}>
            <div className={styles.header}>
                <span className={styles.pageInfo}>Mostrando página {currentPage} de {totalPages || 1}</span>
                <button 
                    onClick={handleMarkAllRead}
                    disabled={isPending || notifications.every(n => n.isRead)}
                    className={styles.markAllBtn}
                >
                    Marcar todas como leídas
                </button>
            </div>

            <div className={styles.list}>
                {notifications.length === 0 ? (
                    <div className={styles.empty}>
                        No tienes notificaciones.
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <div 
                            key={notification.id} 
                            className={`${styles.item} ${!notification.isRead ? styles.unread : ''}`}
                        >
                            <div className={styles.itemContent}>
                                <div className={styles.mainInfo}>
                                    <div className={styles.titleRow}>
                                        <span className={`${styles.title} ${getNotificationColor(notification.type, styles)}`}>
                                            {notification.title}
                                        </span>
                                        {!notification.isRead && (
                                            <span className={styles.newBadge}>
                                                Nueva
                                            </span>
                                        )}
                                    </div>
                                    <p className={styles.message}>{notification.message}</p>
                                    <div className={styles.meta}>
                                        <span>{new Date(notification.createdAt).toLocaleString()}</span>
                                        {notification.link && (
                                            <Link href={notification.link} className={styles.link}>
                                                Ver detalles
                                            </Link>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.actions}>
                                    {!notification.isRead && (
                                        <button 
                                            onClick={() => handleMarkAsRead(notification.id)}
                                            className={`${styles.iconBtn} ${styles.checkBtn}`}
                                            title="Marcar como leída"
                                        >
                                            <CheckIcon />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleDelete(notification.id)}
                                        className={`${styles.iconBtn} ${styles.trashBtn}`}
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
                <div className={styles.pagination}>
                    <Link 
                        href={`/dashboard/notifications?page=${Math.max(1, currentPage - 1)}`}
                        className={`${styles.pageLink} ${currentPage === 1 ? styles.disabledLink : ''}`}
                    >
                        Anterior
                    </Link>
                    <Link 
                        href={`/dashboard/notifications?page=${Math.min(totalPages, currentPage + 1)}`}
                        className={`${styles.pageLink} ${currentPage === totalPages ? styles.disabledLink : ''}`}
                    >
                        Siguiente
                    </Link>
                </div>
            )}
        </div>
    );
}

function getNotificationColor(type: string, styles: any) {
    switch (type) {
        case 'WARNING': return styles.typeWarning;
        case 'ERROR': return styles.typeError;
        case 'SUCCESS': return styles.typeSuccess;
        default: return styles.typeInfo;
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