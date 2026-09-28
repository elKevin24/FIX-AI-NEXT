'use client';

import React, { useEffect } from 'react';
import { SerwistProvider } from '@serwist/turbopack/react';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // In development mode, aggressively unregister any existing service worker
    // so that stale cached chunks do not block live application updates.
    if (process.env.NODE_ENV === 'development' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
      if ('caches' in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key);
          }
        });
      }
    }
  }, []);

  if (process.env.NODE_ENV === 'development') {
    return <>{children}</>;
  }

  return (
    <SerwistProvider swUrl="/serwist/sw.js">
      {children}
    </SerwistProvider>
  );
}
