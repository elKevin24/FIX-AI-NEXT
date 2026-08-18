
import { getAllMyNotifications } from '@/lib/notifications';
import NotificationList from './NotificationList';
import styles from './notifications.module.css';

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const { notifications, totalPages } = await getAllMyNotifications(page);

  return (
    <div className={styles['container']}>
      <div className={styles['header']}>
        <h1>Notificaciones</h1>
      </div>
      <NotificationList 
        initialNotifications={notifications} 
        totalPages={totalPages} 
        currentPage={page} 
      />
    </div>
  );
}
