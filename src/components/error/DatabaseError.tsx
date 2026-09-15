'use client';

import styles from './DatabaseError.module.css';

interface DatabaseErrorProps {
  message?: string;
  retry?: () => void;
}

export default function DatabaseError({ message, retry }: DatabaseErrorProps) {
  return (
    <div className={styles['container']}>
      <div className={styles['card']}>
        <div className={styles['icon']}>⚠️</div>
        <h1 className={styles['title']}>Error de Conexión</h1>
        <p className={styles['message']}>
          {message || 'No se puede conectar con la base de datos. Por favor, verifica tu conexión a internet.'}
        </p>
        <div className={styles['details']}>
          <p className={styles['detailsTitle']}>Posibles causas:</p>
          <ul className={styles['list']}>
            <li>Problemas de conexión a internet</li>
            <li>El servidor de base de datos está temporalmente no disponible</li>
            <li>Configuración de red o firewall bloqueando la conexión</li>
          </ul>
        </div>
        {retry && (
          <button onClick={retry} className={styles['retryButton']}>
            🔄 Reintentar Conexión
          </button>
        )}
        <a href="/dashboard" className={styles['homeButton']}>
          🏠 Volver al Inicio
        </a>
      </div>
    </div>
  );
}
