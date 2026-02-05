'use client';

import { useOnlineUsers } from '@/hooks/useOnlineUsers';
import PresenceIndicator from './PresenceIndicator';
import { TechnicianStatus } from '@/generated/prisma';

export default function OnlineUsersList({ tenantId }: { tenantId?: string }) {
  const users = useOnlineUsers(tenantId);

  if (users.length === 0) return null;

  return (
    <div style={{ padding: '1rem', borderTop: '1px solid #e5e7eb' }}>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#6b7280' }}>
        Online Users
      </h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {users.map((presence) => (
          <li key={presence.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            <PresenceIndicator status={presence.status as TechnicianStatus} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 500 }}>{presence.user.name || presence.user.email}</span>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{presence.currentPage || 'Browsing...'}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
