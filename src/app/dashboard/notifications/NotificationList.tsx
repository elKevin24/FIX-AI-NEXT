'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { markMyNotificationAsRead, deleteMyNotification, markAllMyNotificationsAsRead } from '@/lib/notifications';
import { Button, Badge } from '@/components/ui';
import PaginationControls from '@/components/ui/PaginationControls';
import { 
    Check, 
    CheckCheck, 
    Trash2, 
    ExternalLink, 
    Inbox, 
    Info, 
    AlertTriangle, 
    AlertCircle, 
    CheckCircle2, 
    Clock,
    Sparkles
} from 'lucide-react';
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
    totalCount: number;
}

export default function NotificationList({ initialNotifications, totalPages, currentPage, totalCount }: Props) {
    const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleMarkAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        await markMyNotificationAsRead(id);
        startTransition(() => {
            router.refresh();
        });
    };

    const handleDelete = async (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        await deleteMyNotification(id);
        startTransition(() => {
            router.refresh();
        });
    };

    const handleMarkAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        await markAllMyNotificationsAsRead();
        startTransition(() => {
            router.refresh();
        });
    };

    return (
        <div className={styles['card']}>
            <div className={styles['cardHeader']}>
                <div className={styles['headerInfo']}>
                    <div className={styles['headerTitleRow']}>
                        <h2 className={styles['cardTitle']}>Bandeja de Entrada</h2>
                        {unreadCount > 0 && (
                            <Badge variant="primary" size="sm" hasDot>
                                {unreadCount} sin leer
                            </Badge>
                        )}
                    </div>
                    <p className={styles['cardSubtitle']}>
                        Tienes un total de <span className={styles['bold']}>{totalCount}</span> {totalCount === 1 ? 'notificación registrada' : 'notificaciones registradas'}.
                    </p>
                </div>
                <div className={styles['headerActions']}>
                    <Button 
                        onClick={handleMarkAllRead}
                        disabled={isPending || notifications.every(n => n.isRead)}
                        variant="secondary"
                        size="sm"
                        leftIcon={<CheckCheck size={16} />}
                    >
                        Marcar todas como leídas
                    </Button>
                </div>
            </div>

            <div className={styles['list']}>
                {notifications.length === 0 ? (
                    <div className={styles['emptyState']}>
                        <div className={styles['emptyIconWrapper']}>
                            <Inbox size={48} className={styles['emptyIcon']} aria-hidden="true" />
                        </div>
                        <h3 className={styles['emptyTitle']}>Sin notificaciones</h3>
                        <p className={styles['emptyDescription']}>
                            Actualmente no tienes notificaciones pendientes ni alertas activas en tu cuenta.
                        </p>
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <div 
                            key={notification.id} 
                            className={`${styles['item']} ${!notification.isRead ? styles['unread'] : ''}`}
                        >
                            <div className={styles['itemLeading']}>
                                <NotificationBadgeIcon type={notification.type} />
                            </div>

                            <div className={styles['itemBody']}>
                                <div className={styles['titleRow']}>
                                    <h4 className={styles['title']}>{notification.title}</h4>
                                    <div className={styles['badgeRow']}>
                                        <NotificationTypeBadge type={notification.type} />
                                        {!notification.isRead && (
                                            <span className={styles['newPill']}>
                                                <Sparkles size={11} aria-hidden="true" />
                                                Nueva
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p className={styles['message']}>{notification.message}</p>
                                <div className={styles['meta']}>
                                    <span className={styles['metaTime']}>
                                        <Clock size={13} aria-hidden="true" />
                                        {new Date(notification.createdAt).toLocaleDateString(undefined, {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                    {notification.link && (
                                        <Link href={notification.link} className={styles['link']}>
                                            <span>Ver detalles</span>
                                            <ExternalLink size={13} aria-hidden="true" />
                                        </Link>
                                    )}
                                </div>
                            </div>

                            <div className={styles['actions']}>
                                {!notification.isRead && (
                                    <button 
                                        onClick={() => handleMarkAsRead(notification.id)}
                                        className={`${styles['actionBtn']} ${styles['checkBtn']}`}
                                        title="Marcar como leída"
                                        aria-label="Marcar como leída"
                                    >
                                        <Check size={16} aria-hidden="true" />
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleDelete(notification.id)}
                                    className={`${styles['actionBtn']} ${styles['trashBtn']}`}
                                    title="Eliminar notificación"
                                    aria-label="Eliminar notificación"
                                >
                                    <Trash2 size={16} aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {totalPages > 1 && (
                <div className={styles['paginationWrapper']}>
                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        hasNextPage={currentPage < totalPages}
                        hasPrevPage={currentPage > 1}
                        totalItems={totalCount}
                    />
                </div>
            )}
        </div>
    );
}

function NotificationBadgeIcon({ type }: { type: string }) {
    switch (type) {
        case 'WARNING':
            return (
                <div className={`${styles['iconCircle']} ${styles['iconCircleWarning']}`}>
                    <AlertTriangle size={18} aria-hidden="true" />
                </div>
            );
        case 'ERROR':
            return (
                <div className={`${styles['iconCircle']} ${styles['iconCircleError']}`}>
                    <AlertCircle size={18} aria-hidden="true" />
                </div>
            );
        case 'SUCCESS':
            return (
                <div className={`${styles['iconCircle']} ${styles['iconCircleSuccess']}`}>
                    <CheckCircle2 size={18} aria-hidden="true" />
                </div>
            );
        default:
            return (
                <div className={`${styles['iconCircle']} ${styles['iconCircleInfo']}`}>
                    <Info size={18} aria-hidden="true" />
                </div>
            );
    }
}

function NotificationTypeBadge({ type }: { type: string }) {
    switch (type) {
        case 'WARNING':
            return <Badge variant="warning" size="sm">Aviso</Badge>;
        case 'ERROR':
            return <Badge variant="error" size="sm">Urgente</Badge>;
        case 'SUCCESS':
            return <Badge variant="success" size="sm">Éxito</Badge>;
        default:
            return <Badge variant="info" size="sm">Info</Badge>;
    }
}