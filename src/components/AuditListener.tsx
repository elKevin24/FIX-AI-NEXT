'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { logPageAccess } from '@/lib/audit-actions';
import { usePresence } from '@/hooks/usePresence';

export default function AuditListener() {
  const pathname = usePathname();
  
  // Activate Presence System
  usePresence();

  // Log Page Access
  useEffect(() => {
    if (pathname) {
      logPageAccess(pathname);
    }
  }, [pathname]);

  return null; // This component renders nothing
}
