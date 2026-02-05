import React from 'react';
import { PresenceStatus } from '@prisma/client';

const statusColors: Record<PresenceStatus, string> = {
  ONLINE: '#22c55e', // green-500
  AWAY: '#eab308',   // yellow-500
  BUSY: '#ef4444',   // red-500
  OFFLINE: '#9ca3af' // gray-400
};

export default function PresenceIndicator({ status }: { status: PresenceStatus }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '0.5rem',
        height: '0.5rem',
        borderRadius: '50%',
        backgroundColor: statusColors[status] || statusColors.OFFLINE,
        marginRight: '0.5rem'
      }}
      title={status}
    />
  );
}
