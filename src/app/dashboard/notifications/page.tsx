
import { getAllMyNotifications } from '@/lib/notifications';
import NotificationList from './NotificationList';
import PageHeader from '@/components/PageHeader';
import styles from './notifications.module.css';

export const metadata = {
  title: 'Notificaciones',
  description: 'Centro de notificaciones y alertas de tickets y sistema.',
  openGraph: {
    title: 'Notificaciones | FIX Workshop',
    description: 'Centro de notificaciones y alertas de tickets y sistema.',
  },
};

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
      <PageHeader title="Notificaciones" />
      <NotificationList 
        initialNotifications={notifications} 
        totalPages={totalPages} 
        currentPage={page} 
      />
    </div>
  );
}
