'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAvailableParts,
  addPartToTemplate,
  updateTemplateDefaultPart,
  removePartFromTemplate,
} from '@/lib/service-template-actions';

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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          📦 Partes de la Plantilla
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Define las partes que se usarán por defecto al crear tickets con esta plantilla.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Current Parts */}
      {defaultParts.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Parte
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {defaultParts.map((dp) => (
                <tr key={dp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{dp.part.name}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {dp.part.sku || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === dp.id ? (
                      <input
                        type="number"
                        min="1"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded"
                      />
                    ) : (
                      <span className="text-gray-900">{dp.quantity}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === dp.id ? (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editRequired}
                          onChange={(e) => setEditRequired(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">Requerido</span>
                      </label>
                    ) : (
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          dp.required
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {dp.required ? '✓ Requerido' : 'Opcional'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-sm ${
                        dp.part.quantity >= dp.quantity
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {dp.part.quantity} disponibles
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === dp.id ? (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleSaveEdit(dp.id)}
                          disabled={loading}
                          className="text-sm text-green-600 hover:text-green-700 disabled:opacity-50"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-sm text-gray-600 hover:text-gray-700"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleStartEdit(dp)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleRemove(dp.id)}
                          disabled={loading}
                          className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
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
      )}

      {defaultParts.length === 0 && (
        <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
          <p className="text-gray-500">
            No hay partes agregadas. Agrega partes para que se usen automáticamente al crear
            tickets.
          </p>
        </div>
      )}

      {/* Add Part Form */}
      {availableParts.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-3">Agregar Parte</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              value={selectedPartId}
              onChange={(e) => setSelectedPartId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
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
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Agregando...' : 'Agregar'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Las partes <strong>requeridas</strong> consumirán stock automáticamente al crear
            el ticket. Las <strong>opcionales</strong> solo aparecerán como sugerencia.
          </p>
        </div>
      )}

      {availableParts.length === 0 && defaultParts.length > 0 && (
        <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-4">
          ℹ️ Todas las partes disponibles ya están agregadas a esta plantilla.
        </div>
      )}
    </div>
  );
}
