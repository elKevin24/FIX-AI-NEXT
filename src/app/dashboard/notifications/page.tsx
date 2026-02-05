
import { getAllMyNotifications } from '@/lib/notifications';
import NotificationList from './NotificationList';

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const { notifications, totalPages } = await getAllMyNotifications(page);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Notificaciones</h1>
      <NotificationList 
        initialNotifications={notifications} 
        totalPages={totalPages} 
        currentPage={page} 
      />
    </div>
  );
}
