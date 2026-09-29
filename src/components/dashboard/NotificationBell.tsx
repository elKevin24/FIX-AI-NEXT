'use client';

import { useState, useEffect, useRef } from 'react';
import { getMyNotifications, markMyNotificationAsRead, markAllMyNotificationsAsRead } from '@/lib/notifications';
import { useToast } from '@/context/ToastContext';
import Link from 'next/link';
import { 
    Bell, 
    Check, 
    CheckCheck, 
    ArrowRight, 
    Inbox,
    Info, 
    AlertTriangle, 
    AlertCircle, 
    CheckCircle2 
} from 'lucide-react';
import styles from './NotificationBell.module.css';

// Helper for type
interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    link?: string | null;
    createdAt: Date;
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { addToast } = useToast();
    const lastNotifIdRef = useRef<string | null>(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const data = await getMyNotifications();
                const parsedData = data.map((n: any) => ({
                    ...n,
                    createdAt: new Date(n.createdAt)
                }));

                if (parsedData.length > 0) {
                    const latest = parsedData[0];
                    if (lastNotifIdRef.current && lastNotifIdRef.current !== latest.id && !latest.isRead) {
                        addToast(latest.message, latest.type as any, latest.title);
                    }
                    lastNotifIdRef.current = latest.id;
                }

                setNotifications(parsedData);
            } catch (error) {
                console.error('Error fetching notifications:', error);
            }
        };

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [addToast]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Manejadores para Hover
    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsOpen(true);
    };

    const handleMouseLeave = () => {
        // Pequeño retraso antes de cerrar (300ms) para mejorar la UX
        timeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 300);
    };

    // Limpiar timeout al desmontar
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await markMyNotificationAsRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    };

    const handleMarkAllRead = async () => {
        await markAllMyNotificationsAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    return (
        <div 
            className={styles['container']} 
            ref={containerRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button 
                className={`${styles['bellButton']} ${isOpen ? styles['active'] : ''}`}
                aria-label="Notificaciones"
                title="Notificaciones"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <Bell size={20} aria-hidden="true" />
                {unreadCount > 0 && (
                    <span className={styles['unreadBadge']} aria-label={`${unreadCount} notificaciones no leídas`}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className={styles['dropdown']} role="region" aria-label="Panel de Notificaciones">
                    <div className={styles['header']}>
                        <div className={styles['headerTitleGroup']}>
                            <h3 className={styles['title']}>Notificaciones</h3>
                            {unreadCount > 0 && (
                                <span className={styles['headerUnreadPill']}>
                                    {unreadCount} nuevas
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button 
                                onClick={handleMarkAllRead} 
                                className={styles['markAllRead']}
                                title="Marcar todas como leídas"
                            >
                                <CheckCheck size={14} aria-hidden="true" />
                                <span>Marcar leídas</span>
                            </button>
                        )}
                    </div>
                    
                    <div className={styles['list']}>
                        {notifications.length === 0 ? (
                            <div className={styles['emptyState']}>
                                <Inbox size={36} className={styles['emptyIcon']} aria-hidden="true" />
                                <p className={styles['emptyText']}>No tienes notificaciones.</p>
                                <span className={styles['emptySubtext']}>Te avisaremos cuando haya actualizaciones importantes</span>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div 
                                    key={notification.id} 
                                    className={`${styles['notificationItem']} ${!notification.isRead ? styles['unread'] : ''}`}
                                >
                                    <div className={styles['itemHeader']}>
                                        <div className={styles['itemTitleGroup']}>
                                            <NotificationTypeIcon type={notification.type} />
                                            <span className={`${styles['itemTitle']} ${getNotificationTypeClass(notification.type, styles)}`}>
                                                {notification.title}
                                            </span>
                                        </div>
                                        {!notification.isRead && (
                                            <button 
                                                onClick={(e) => handleMarkAsRead(notification.id, e)}
                                                className={styles['closeBtn']}
                                                title="Marcar como leída"
                                                aria-label="Marcar como leída"
                                            >
                                                <Check size={14} aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>
                                    <p className={styles['message']}>{notification.message}</p>
                                    <div className={styles['itemFooter']}>
                                        <span className={styles['date']}>
                                            {new Date(notification.createdAt).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                        {notification.link && (
                                            <Link 
                                                href={notification.link} 
                                                onClick={() => setIsOpen(false)}
                                                className={styles['detailsLink']}
                                            >
                                                <span>Ver detalles</span>
                                                <ArrowRight size={13} aria-hidden="true" />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <Link 
                        href="/dashboard/notifications" 
                        onClick={() => setIsOpen(false)}
                        className={styles['viewAll']}
                    >
                        Ver todas las notificaciones
                        <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                </div>
            )}
        </div>
    );
}

function NotificationTypeIcon({ type }: { type: string }) {
    switch (type) {
        case 'WARNING': 
            return <AlertTriangle size={15} className={styles['iconWarning']} aria-hidden="true" />;
        case 'ERROR': 
            return <AlertCircle size={15} className={styles['iconError']} aria-hidden="true" />;
        case 'SUCCESS': 
            return <CheckCircle2 size={15} className={styles['iconSuccess']} aria-hidden="true" />;
        default: 
            return <Info size={15} className={styles['iconInfo']} aria-hidden="true" />;
    }
}

function getNotificationTypeClass(type: string, styles: any) {
    switch (type) {
        case 'WARNING': return styles['typeWarning'];
        case 'ERROR': return styles['typeError'];
        case 'SUCCESS': return styles['typeSuccess'];
        default: return styles['typeInfo'];
    }
}
