import React from 'react';

// Map TechnicianStatus to colors for the indicator
const statusColors: Record<string, string> = {
  AVAILABLE: '#22c55e', // green-500
  UNAVAILABLE: '#ef4444', // red-500
  ON_VACATION: '#3b82f6', // blue-500
  ON_LEAVE: '#eab308',   // yellow-500
  IN_TRAINING: '#8b5cf6', // purple-500
  SICK_LEAVE: '#f97316',  // orange-500
  // Fallback for presence if they still use old terms
  ONLINE: '#22c55e',
  AWAY: '#eab308',
  BUSY: '#ef4444',
  OFFLINE: '#9ca3af'
};

export default function PresenceIndicator({ status }: { status: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '0.5rem',
        height: '0.5rem',
        borderRadius: '50%',
        backgroundColor: statusColors[status] || '#9ca3af',
        marginRight: '0.5rem'
      }}
      title={status}
    />
  );
}