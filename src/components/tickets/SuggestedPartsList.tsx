'use client';

import { useState } from 'react';
import { getPartStockStatus, formatCurrency } from '@/lib/template-utils';
import styles from './SuggestedPartsList.module.css';

export type SuggestedPart = {
  partId: string;
  name: string;
  sku: string | null;
  quantity: number;
  price: number;
  stockAvailable: number;
};

interface SuggestedPartsListProps {
  parts: SuggestedPart[];
  onAddPart: (partId: string, quantity: number) => void;
  addedPartIds?: Set<string>; // Track which parts have been added
}

export default function SuggestedPartsList({
  parts,
  onAddPart,
  addedPartIds = new Set(),
}: SuggestedPartsListProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAddPart = async (partId: string, quantity: number) => {
    setLoading(partId);
    try {
      await onAddPart(partId, quantity);
    } finally {
      setLoading(null);
    }
  };

  if (parts.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>💡 Repuestos Sugeridos</h4>
        <p className={styles.subtitle}>
          Estos repuestos son opcionales y no se consumirán automáticamente.
          Puedes agregarlos manualmente si son necesarios.
        </p>
      </div>

      <div className={styles.partsList}>
        {parts.map((part) => {
          const stockStatus = getPartStockStatus(
            part.stockAvailable,
            part.quantity
          );
          const isAdded = addedPartIds.has(part.partId);
          const isLoading = loading === part.partId;
          const isDisabled =
            stockStatus === 'insufficient' || isAdded || isLoading;

          return (
            <div
              key={part.partId}
              className={`${styles.partCard} ${
                isAdded ? styles.partCardAdded : ''
              }`}
            >
              <div className={styles.partInfo}>
                <div className={styles.partName}>
                  {part.name}
                  {part.sku && (
                    <span className={styles.partSku}>SKU: {part.sku}</span>
                  )}
                </div>
                <div className={styles.partDetails}>
                  <span className={styles.quantity}>
                    Cantidad sugerida: {part.quantity}
                  </span>
                  <span className={styles.price}>
                    {formatCurrency(part.price * part.quantity)}
                  </span>
                </div>
              </div>

              <div className={styles.partActions}>
                <div className={styles.badges}>
                  <span
                    className={`${styles.stockBadge} ${
                      stockStatus === 'insufficient'
                        ? styles.stockInsufficient
                        : stockStatus === 'low'
                        ? styles.stockLow
                        : styles.stockSufficient
                    }`}
                  >
                    {stockStatus === 'insufficient' && '❌'}
                    {stockStatus === 'low' && '⚠️'}
                    {stockStatus === 'sufficient' && '✅'}
                    {' '}Stock: {part.stockAvailable}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddPart(part.partId, part.quantity)}
                  disabled={isDisabled}
                  className={styles.addButton}
                >
                  {isLoading ? (
                    <>
                      <span className={styles.spinner} />
                      Agregando...
                    </>
                  ) : isAdded ? (
                    <>
                      <span>✓</span> Agregado
                    </>
                  ) : stockStatus === 'insufficient' ? (
                    'Sin Stock'
                  ) : (
                    <>
                      <span>+</span> Agregar
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
