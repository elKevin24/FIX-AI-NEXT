'use client';

import { useToast } from '@/contexts/ToastContext';
import Toast from './Toast';
import styles from './Toast.module.css';

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className={styles['container']} aria-live="polite" aria-atomic="true">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          {...toast}
          onDismiss={removeToast}
        />
      ))}
    </div>
  );
}
