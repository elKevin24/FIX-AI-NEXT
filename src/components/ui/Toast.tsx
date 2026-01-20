'use client';

import { useEffect, useState, useCallback } from 'react';
import styles from './Toast.module.css';

export type ToastType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface ToastProps {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  onDismiss: (id: string) => void;
}

export default function Toast({ id, type, title, message, duration = 5000, onDismiss }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    // Wait for animation to finish
    setTimeout(() => {
      onDismiss(id);
    }, 300);
  }, [id, onDismiss]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, handleDismiss]);

  const getTypeClass = () => {
    switch (type) {
      case 'SUCCESS': return styles.success;
      case 'WARNING': return styles.warning;
      case 'ERROR': return styles.error;
      default: return styles.info;
    }
  };

  return (
    <div className={`${styles.toast} ${getTypeClass()} ${isExiting ? styles.exiting : ''}`} role="alert">
      <div className={styles.content}>
        {title && <span className={styles.title}>{title}</span>}
        <span className={styles.message}>{message}</span>
      </div>
      <button onClick={handleDismiss} className={styles.closeBtn} aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  );
}
