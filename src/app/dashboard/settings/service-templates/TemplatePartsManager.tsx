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
      await addPartToTemplate(templateId, selectedPartId, quantity, required);
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
      await updateTemplateDefaultPart(id, editQuantity, editRequired);
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
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          📦 Partes de la Plantilla
        </h3>
        <p className="text-sm text-gray-600">
          Define las partes que se usarán por defecto al crear tickets con esta plantilla.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {/* Current Parts - Mobile Cards / Desktop Table */}
      {defaultParts.length > 0 && (
        <>
          {/* Mobile: Cards */}
          <div className="block md:hidden space-y-3">
            {defaultParts.map((dp) => (
              <div key={dp.id} className={styles.partsCard}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{dp.part.name}</div>
                    {dp.part.sku && (
                      <div className="text-xs text-gray-500">{dp.part.sku}</div>
                    )}
                  </div>
                  <span
                    className={`${styles.glassBadge} ${
                      dp.required ? styles.requiredBadge : styles.optionalBadge
                    }`}
                  >
                    {dp.required ? 'Requerido' : 'Opcional'}
                  </span>
                </div>

                {editingId === dp.id ? (
                  <div className="space-y-2">
                    <input
                      type="number"
                      min="1"
                      value={editQuantity}
                      onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      placeholder="Cantidad"
                    />
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editRequired}
                        onChange={(e) => setEditRequired(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">Requerido</span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(dp.id)}
                        disabled={loading}
                        className="flex-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <span>Cantidad: {dp.quantity}</span>
                      <span
                        className={
                          dp.part.quantity >= dp.quantity
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      >
                        Stock: {dp.part.quantity}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartEdit(dp)}
                        className="flex-1 px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleRemove(dp.id)}
                        disabled={loading}
                        className="flex-1 px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 disabled:opacity-50"
                      >
                        Quitar
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Desktop: Table */}
          <div className={`hidden md:block ${styles.glassTable}`}>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                    Parte
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                    Cantidad
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                    Tipo
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                    Stock
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {defaultParts.map((dp) => (
                  <tr key={dp.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{dp.part.name}</div>
                      {dp.part.sku && (
                        <div className="text-xs text-gray-500">{dp.part.sku}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editingId === dp.id ? (
                        <input
                          type="number"
                          min="1"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      ) : (
                        <span className="text-sm">{dp.quantity}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editingId === dp.id ? (
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={editRequired}
                            onChange={(e) => setEditRequired(e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">Req.</span>
                        </label>
                      ) : (
                        <span
                          className={`${styles.glassBadge} ${
                            dp.required ? styles.requiredBadge : styles.optionalBadge
                          }`}
                        >
                          {dp.required ? 'Req.' : 'Opc.'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-sm ${
                          dp.part.quantity >= dp.quantity
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {dp.part.quantity}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {editingId === dp.id ? (
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={() => handleSaveEdit(dp.id)}
                            disabled={loading}
                            className="text-sm px-2 py-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-sm px-2 py-1 text-gray-600 hover:bg-gray-50 rounded"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={() => handleStartEdit(dp)}
                            className="text-sm px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleRemove(dp.id)}
                            disabled={loading}
                            className="text-sm px-2 py-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                          >
                            Quitar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Empty State */}
      {defaultParts.length === 0 && (
        <div className={styles.emptyState}>
          <p className="text-sm text-gray-500">
            No hay partes agregadas. Agrega partes para que se usen automáticamente al crear tickets.
          </p>
        </div>
      )}

      {/* Add Part Form */}
      {availableParts.length > 0 && (
        <div className={styles.formSection}>
          <h4 className="font-medium text-gray-900 text-sm mb-3">Agregar Parte</h4>
          <div className="space-y-2">
            {/* Mobile: Stacked */}
            <div className="block md:hidden space-y-2">
              <select
                value={selectedPartId}
                onChange={(e) => setSelectedPartId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Seleccionar parte...</option>
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
                placeholder="Cantidad"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-white">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Requerido</span>
              </label>
              <button
                onClick={handleAddPart}
                disabled={loading || !selectedPartId}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Agregando...' : 'Agregar'}
              </button>
            </div>

            {/* Desktop: Grid */}
            <div className="hidden md:grid md:grid-cols-[2fr_auto_auto_auto] gap-2">
              <select
                value={selectedPartId}
                onChange={(e) => setSelectedPartId(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Seleccionar parte...</option>
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
                className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <label className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg bg-white whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Req.</span>
              </label>
              <button
                onClick={handleAddPart}
                disabled={loading || !selectedPartId}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
              >
                {loading ? 'Agregando...' : 'Agregar'}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Las partes <strong>requeridas</strong> consumen stock al crear el ticket. Las <strong>opcionales</strong> son sugerencias.
          </p>
        </div>
      )}

      {/* Info Message */}
      {availableParts.length === 0 && defaultParts.length > 0 && (
        <div className={styles.infoAlert}>
          ℹ️ Todas las partes disponibles ya están agregadas a esta plantilla.
        </div>
      )}
    </div>
  );
}
