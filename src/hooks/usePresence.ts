'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { updatePresence, setUserStatus } from '@/lib/presence-actions';

// Status types
type PresenceStatus = 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE';

export function usePresence() {
  const pathname = usePathname();
  const [status, setLocalStatus] = useState<PresenceStatus>('ONLINE');
  const [ticketId, setTicketId] = useState<string | null>(null);

  // Extract ticket ID from pathname if possible
  useEffect(() => {
    // Example: /dashboard/tickets/UUID
    const match = pathname?.match(/\/tickets\/([0-9a-fA-F-]{36})/);
    if (match) {
      setTicketId(match[1]);
    } else {
      setTicketId(null);
    }
  }, [pathname]);

  const sendPresenceUpdate = useCallback(async () => {
    // Determine page title or name from pathname
    let pageName = 'Unknown';
    if (pathname === '/dashboard') pageName = 'Dashboard';
    else if (pathname?.startsWith('/dashboard/tickets')) pageName = 'Tickets';
    else if (pathname?.startsWith('/dashboard/users')) pageName = 'Users';
    // ... add more mappings

    // If status is OFFLINE (manually set), maybe don't ping? 
    // But we usually want to show them as Online if they are using the app.
    // The requirement says "Al salir del navegador -> OFFLINE", handled by stale check.
    
    await updatePresence(
      pathname || '',
      document.title || pageName,
      ticketId
    );
  }, [pathname, ticketId]);

  // Ping every 60 seconds
  useEffect(() => {
    sendPresenceUpdate(); // Initial ping
    const interval = setInterval(sendPresenceUpdate, 60000);
    return () => clearInterval(interval);
  }, [sendPresenceUpdate]);

  // Activity detection
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const resetTimer = () => {
      if (status === 'AWAY') {
        setLocalStatus('ONLINE');
        setUserStatus('ONLINE');
      }
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setLocalStatus('AWAY');
        setUserStatus('AWAY');
      }, 5 * 60 * 1000); // 5 minutes
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);

    resetTimer(); // Start timer

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, [status]);

  return { status, setStatus: setUserStatus };
}
