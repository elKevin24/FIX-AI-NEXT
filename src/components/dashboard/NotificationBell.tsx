'use client';

import { useState, useEffect, useRef } from 'react';
import { getMyNotifications, markMyNotificationAsRead, markAllMyNotificationsAsRead } from '@/lib/notifications';
import Link from 'next/link';

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

    const fetchNotifications = async () => {
        try {
            const data = await getMyNotifications();
            // Ensure dates are parsed if they come as strings
            const parsedData = data.map((n: any) => ({
                ...n,
                createdAt: new Date(n.createdAt)
            }));
            setNotifications(parsedData);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Poll every minute
        return () => clearInterval(interval);
    }, []);

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
        <div className="relative" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
                aria-label="Notificaciones"
                title="Notificaciones"
            >
                <BellIcon />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full" style={{ fontSize: '10px' }}>
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div 
                    className="absolute bottom-full left-0 mb-2 w-60 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden z-50 transform -translate-y-2 origin-bottom-left"
                    style={{ maxHeight: '400px', display: 'flex', flexDirection: 'column' }}
                >
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                        <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100">Notificaciones</h3>
                        {unreadCount > 0 && (
                            <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400">
                                Marcar leídas
                            </button>
                        )}
                    </div>
                    
                    <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                            <p className="p-4 text-center text-gray-500 text-sm">No tienes notificaciones.</p>
                        ) : (
                            notifications.map(notification => (
                                <div 
                                    key={notification.id} 
                                    className={`p-3 border-b border-gray-100 dark:border-gray-800 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${!notification.isRead ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1 gap-2">
                                        <span className={`font-medium ${getNotificationColor(notification.type)}`}>
                                            {notification.title}
                                        </span>
                                        {!notification.isRead && (
                                            <button 
                                                onClick={(e) => handleMarkAsRead(notification.id, e)}
                                                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                                                title="Marcar como leída"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">{notification.message}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-400">
                                            {new Date(notification.createdAt).toLocaleDateString()}
                                        </span>
                                        {notification.link && (
                                            <Link 
                                                href={notification.link}
                                                onClick={() => setIsOpen(false)}
                                                className="text-blue-600 hover:underline text-xs"
                                            >
                                                Ver detalles &rarr;
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
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

function BellIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
    );
}
