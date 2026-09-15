'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAvailableParts,
  addPartToTemplate,
  updateTemplateDefaultPart,
  removePartFromTemplate,
} from '@/lib/service-template-actions';
import styles from './service-templates.module.css';

type Part = {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  cost: any;
  price: any;
};

type DefaultPart = {
  id: string;
  quantity: number;
  required: boolean;
  part: Part;
};

type Props = {
  templateId: string;
  defaultParts: DefaultPart[];
};

export function TemplatePartsManager({ templateId, defaultParts }: Props) {
  const router = useRouter();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Add part form
  const [selectedPartId, setSelectedPartId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [required, setRequired] = useState(false);

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState(1);
  const [editRequired, setEditRequired] = useState(false);

  useEffect(() => {
    loadParts();
  }, []);

  const loadParts = async () => {
    try {
      const availableParts = await getAvailableParts();
      setParts(availableParts);
    } catch (err) {
      console.error('Error loading parts:', err);
    }
  };

  const handleAddPart = async () => {
    if (!selectedPartId) {
      setError('Selecciona una parte');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('templateId', templateId);
      data.append('partId', selectedPartId);
      data.append('quantity', quantity.toString());
      data.append('required', String(required));

      await addPartToTemplate(data);
      setSelectedPartId('');
      setQuantity(1);
      setRequired(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar parte');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (defaultPart: DefaultPart) => {
    setEditingId(defaultPart.id);
    setEditQuantity(defaultPart.quantity);
    setEditRequired(defaultPart.required);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditQuantity(1);
    setEditRequired(false);
  };

  const handleSaveEdit = async (id: string) => {
    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('id', id);
      data.append('quantity', editQuantity.toString());
      data.append('required', String(editRequired));

      await updateTemplateDefaultPart(data);
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar parte');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('¿Estás seguro de quitar esta parte de la plantilla?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await removePartFromTemplate(id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al quitar parte');
    } finally {
      setLoading(false);
    }
  };

  const availableParts = parts.filter(
    (p) => !defaultParts.some((dp) => dp.part.id === p.id)
  );

  return (
    <div className={styles.container} style={{ padding: 0 }}>
      {/* Header */}
      <div className={styles.pageHeader} style={{ marginBottom: '1rem' }}>
        <div>
          <h3 className={styles.sectionHeading}>📦 Partes de la Plantilla</h3>
          <p className={styles.pageSubtitle} style={{ marginTop: 0 }}>
            Define las partes que se usarán por defecto.
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className={styles.errorMessage} style={{ marginTop: 0 }}>
          {error}
        </div>
      )}

      {/* Current Parts Table */}
      {defaultParts.length > 0 ? (
        <div className={styles.tableWrapper}>
          <table className={styles.partsTable}>
            <thead>
              <tr>
                <th>Parte</th>
                <th style={{ textAlign: 'center' }}>Cant.</th>
                <th>Tipo</th>
                <th style={{ textAlign: 'center' }}>Stock</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {defaultParts.map((dp) => (
                <tr key={dp.id}>
                  <td>
                    <strong>{dp.part.name}</strong>
                    {dp.part.sku && (
                      <div className={styles.textMuted} style={{ fontSize: '0.7rem' }}>{dp.part.sku}</div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {editingId === dp.id ? (
                      <input
                        type="number"
                        min="1"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                        className={styles.numberInput}
                        style={{ width: '60px', padding: '0.25rem' }}
                      />
                    ) : (
                      <strong>{dp.quantity}</strong>
                    )}
                  </td>
                  <td>
                    {editingId === dp.id ? (
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={editRequired}
                          onChange={(e) => setEditRequired(e.target.checked)}
                        />
                        <span>Req.</span>
                      </label>
                    ) : (
                      <span className={`${styles.badge} ${dp.required ? styles.requiredBadge : styles.optionalBadge}`}>
                        {dp.required ? 'Obligatorio' : 'Sugerido'}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={dp.part.quantity >= dp.quantity ? styles.textSuccess : styles.textDanger}>
                      {dp.part.quantity}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {editingId === dp.id ? (
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleSaveEdit(dp.id)} disabled={loading} className={`${styles.btn} ${styles.btnActivate}`}>
                          OK
                        </button>
                        <button onClick={handleCancelEdit} className={`${styles.btn} ${styles.btnDuplicate}`}>
                          X
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleStartEdit(dp)} className={`${styles.btn} ${styles.btnEdit}`}>
                          Editar
                        </button>
                        <button onClick={() => handleRemove(dp.id)} disabled={loading} className={`${styles.btn} ${styles.btnDelete}`}>
                          Borrar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>No hay partes agregadas aún.</p>
        </div>
      )}

      {/* Add Part Form */}
      {availableParts.length > 0 && (
        <div className={styles.formSection}>
          <h4 className={styles.sectionHeading}>+ Agregar Nueva Parte</h4>
          <div className={styles.addPartGrid}>
            <select
              value={selectedPartId}
              onChange={(e) => setSelectedPartId(e.target.value)}
              className={styles.selectInput}
            >
              <option value="">Seleccionar repuesto...</option>
              {availableParts.map((part) => (
                <option key={part.id} value={part.id}>
                  {part.name} {part.sku ? `(${part.sku})` : ''} - Stock: {part.quantity}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              placeholder="Cant."
              className={styles.numberInput}
              style={{ width: '100%' }}
            />
            <label className={styles.checkboxLabel} style={{ background: 'white', padding: '0.5rem 1rem', borderRadius: 'var(--radius-base)', border: '1px solid var(--color-border-medium)' }}>
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
              />
              <span>Requerido</span>
            </label>
            <button
              onClick={handleAddPart}
              disabled={loading || !selectedPartId}
              className={`${styles.btn} ${styles.mainCreateBtn}`}
              style={{ padding: '0.625rem 2rem' }}
            >
              {loading ? '...' : 'Agregar'}
            </button>
          </div>
          <p className={styles.textMuted} style={{ fontSize: '0.75rem', marginTop: '1rem' }}>
            💡 Las partes requeridas se descuentan automáticamente al crear el ticket.
          </p>
        </div>
      )}
    </div>
  );
}