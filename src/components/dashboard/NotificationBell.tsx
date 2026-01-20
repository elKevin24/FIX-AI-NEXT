'use client';

import { useState, useEffect, useRef } from 'react';
import { getMyNotifications, markMyNotificationAsRead, markAllMyNotificationsAsRead } from '@/lib/notifications';
import { useToast } from '@/context/ToastContext';
import Link from 'next/link';
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
    const { addToast } = useToast();
    const lastNotifIdRef = useRef<string | null>(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const data = await getMyNotifications();
                // Ensure dates are parsed if they come as strings
                const parsedData = data.map((n: any) => ({
                    ...n,
                    createdAt: new Date(n.createdAt)
                }));

                // Check for new notifications to show toast
                if (parsedData.length > 0) {
                    const latest = parsedData[0];
                    if (lastNotifIdRef.current && lastNotifIdRef.current !== latest.id && !latest.isRead) {
                        // New notification detected
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
        const interval = setInterval(fetchNotifications, 60000); // Poll every minute
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

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent closing dropdown
        await markMyNotificationAsRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    };

    const handleMarkAllRead = async () => {
        await markAllMyNotificationsAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    return (
        <div className={styles.container} ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={styles.bellButton}
                aria-label="Notificaciones"
                title="Notificaciones"
            >
                <BellIcon />
                {unreadCount > 0 && (
                    <span className={styles.unreadBadge}>
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.header}>
                        <h3 className={styles.title}>Notificaciones</h3>
                        {unreadCount > 0 && (
                            <button onClick={handleMarkAllRead} className={styles.markAllRead}>
                                Marcar leídas
                            </button>
                        )}
                    </div>
                    
                    <div className={styles.list}>
                        {notifications.length === 0 ? (
                            <p className={styles.emptyState}>No tienes notificaciones.</p>
                        ) : (
                            notifications.map(notification => (
                                <div 
                                    key={notification.id} 
                                    className={`${styles.notificationItem} ${!notification.isRead ? styles.unread : ''}`}
                                >
                                    <div className={styles.itemHeader}>
                                        <span className={`${styles.itemTitle} ${getNotificationTypeClass(notification.type, styles)}`}>
                                            {notification.title}
                                        </span>
                                        {!notification.isRead && (
                                            <button 
                                                onClick={(e) => handleMarkAsRead(notification.id, e)}
                                                className={styles.closeBtn}
                                                title="Marcar como leída"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                    <p className={styles.message}>{notification.message}</p>
                                    <div className={styles.itemFooter}>
                                        <span className={styles.date}>
                                            {new Date(notification.createdAt).toLocaleDateString()}
                                        </span>
                                        {notification.link && (
                                            <Link 
                                                href={notification.link}
                                                onClick={() => setIsOpen(false)}
                                                className={styles.detailsLink}
                                            >
                                                Ver detalles &rarr;
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
                        className={styles.viewAll}
                    >
                        Ver todas las notificaciones
                    </Link>
                </div>
            )}
        </div>
    );
}

function getNotificationTypeClass(type: string, styles: any) {
    switch (type) {
        case 'WARNING': return styles.typeWarning;
        case 'ERROR': return styles.typeError;
        case 'SUCCESS': return styles.typeSuccess;
        default: return styles.typeInfo;
    }
}

function BellIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
    );
}