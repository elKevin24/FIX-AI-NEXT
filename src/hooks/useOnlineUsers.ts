'use client';

import { useEffect, useState } from 'react';
import { getOnlineUsers } from '@/lib/presence-actions';

export function useOnlineUsers(tenantId?: string) {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const onlineUsers = await getOnlineUsers(tenantId);
      setUsers(onlineUsers);
    };

    fetchUsers();
    const interval = setInterval(fetchUsers, 10000); // 10 seconds polling

    return () => clearInterval(interval);
  }, [tenantId]);

  return users;
}
