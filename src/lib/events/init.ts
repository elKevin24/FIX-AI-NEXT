import { registerNotificationHandlers } from '@/lib/events/notification-handlers';

/**
 * Initialize notification event handlers.
 * This should be called once at application startup.
 */
let initialized = false;

export function initializeNotificationSystem(): void {
    if (!initialized) {
        registerNotificationHandlers();
        initialized = true;
        console.log('[NotificationSystem] Event handlers registered');
    }
}