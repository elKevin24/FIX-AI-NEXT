'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createServiceTemplate, updateServiceTemplate } from '@/lib/service-template-actions';

// Define ServiceCategory locally since it may not be exported yet
enum ServiceCategory {
  MAINTENANCE = 'MAINTENANCE',
  REPAIR = 'REPAIR',
  UPGRADE = 'UPGRADE',
  DIAGNOSTIC = 'DIAGNOSTIC',
  INSTALLATION = 'INSTALLATION',
  CONSULTATION = 'CONSULTATION',
}

type ServiceTemplateFormProps = {
  initialData?: {
    id?: string;
    name: string;
    category: ServiceCategory;
    defaultTitle: string;
    defaultDescription: string;
    defaultPriority: string;
    estimatedDuration: number | null;
    laborCost: any;
    isActive: boolean;
    color: string | null;
    icon: string | null;
  };
};

const CATEGORIES = [
  { value: 'MAINTENANCE', label: 'Mantenimiento', color: '#10B981', icon: '🧹' },
  { value: 'REPAIR', label: 'Reparación', color: '#EF4444', icon: '🔧' },
  { value: 'UPGRADE', label: 'Actualización', color: '#3B82F6', icon: '⬆️' },
  { value: 'DIAGNOSTIC', label: 'Diagnóstico', color: '#F59E0B', icon: '🔍' },
  { value: 'INSTALLATION', label: 'Instalación', color: '#8B5CF6', icon: '🪟' },
  { value: 'CONSULTATION', label: 'Asesoría', color: '#6366F1', icon: '💡' },
];

const PRIORITIES = ['Low', 'Medium', 'High', 'URGENT'];

export function ServiceTemplateForm({ initialData }: ServiceTemplateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    category: initialData?.category || ('MAINTENANCE' as ServiceCategory),
    defaultTitle: initialData?.defaultTitle || '',
    defaultDescription: initialData?.defaultDescription || '',
    defaultPriority: initialData?.defaultPriority || 'Medium',
    estimatedDuration: initialData?.estimatedDuration || 60,
    laborCost: initialData?.laborCost ? Number(initialData.laborCost) : 0,
    isActive: initialData?.isActive ?? true,
    color:
      initialData?.color ||
      CATEGORIES.find((c) => c.value === (initialData?.category || 'MAINTENANCE'))?.color ||
      '#3B82F6',
    icon:
      initialData?.icon ||
      CATEGORIES.find((c) => c.value === (initialData?.category || 'MAINTENANCE'))?.icon ||
      '🔧',
  });

  const handleCategoryChange = (category: ServiceCategory) => {
    const categoryData = CATEGORIES.find((c) => c.value === category);
    setFormData({
      ...formData,
      category,
      color: categoryData?.color || formData.color,
      icon: categoryData?.icon || formData.icon,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (initialData?.id) {
        await updateServiceTemplate(initialData.id, formData);
      } else {
        await createServiceTemplate(formData);
      }
      router.push('/dashboard/settings/service-templates');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la plantilla');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Nombre */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nombre de la Plantilla *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Ej: Mantenimiento Básico PC"
        />
      </div>

      {/* Categoría */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Categoría *
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => handleCategoryChange(cat.value as ServiceCategory)}
              className={`p-4 border-2 rounded-lg transition-all ${
                formData.category === cat.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">{cat.icon}</div>
              <div className="text-sm font-medium">{cat.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Título Default */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Título Default para Tickets *
        </label>
        <input
          type="text"
          required
          value={formData.defaultTitle}
          onChange={(e) => setFormData({ ...formData, defaultTitle: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Ej: Mantenimiento preventivo de PC"
        />
        <p className="text-sm text-gray-500 mt-1">
          Este será el título que se usará al crear tickets con esta plantilla
        </p>
      </div>

      {/* Descripción/Checklist */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción / Checklist *
        </label>
        <textarea
          required
          value={formData.defaultDescription}
          onChange={(e) => setFormData({ ...formData, defaultDescription: e.target.value })}
          rows={10}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          placeholder="Checklist de mantenimiento:&#10;- Limpieza interna de polvo&#10;- Revisión de ventiladores&#10;- Aplicación de pasta térmica&#10;- ..."
        />
        <p className="text-sm text-gray-500 mt-1">
          Usa viñetas (-) para crear un checklist
        </p>
      </div>

      {/* Prioridad Default */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Prioridad Default *
        </label>
        <select
          value={formData.defaultPriority}
          onChange={(e) => setFormData({ ...formData, defaultPriority: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
      </div>

      {/* Duración Estimada */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Duración Estimada (minutos)
        </label>
        <input
          type="number"
          min="0"
          step="15"
          value={formData.estimatedDuration || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              estimatedDuration: e.target.value ? parseInt(e.target.value) : 0,
            })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="60"
        />
        <p className="text-sm text-gray-500 mt-1">
          {formData.estimatedDuration && formData.estimatedDuration >= 60
            ? `≈ ${Math.floor(formData.estimatedDuration / 60)}h ${
                formData.estimatedDuration % 60
              }min`
            : ''}
        </p>
      </div>

      {/* Costo de Mano de Obra */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Costo de Mano de Obra ($)
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={formData.laborCost || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              laborCost: e.target.value ? parseFloat(e.target.value) : 0,
            })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="350.00"
        />
      </div>

      {/* Color e Icono */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
          <input
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Icono</label>
          <input
            type="text"
            maxLength={10}
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-2xl"
            placeholder="🔧"
          />
        </div>
      </div>

      {/* Estado Activo */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
          Plantilla activa (visible para crear tickets)
        </label>
      </div>

      {/* Vista Previa */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Vista Previa</h3>
        <div
          className="bg-white p-4 rounded border-l-4"
          style={{ borderLeftColor: formData.color }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{formData.icon}</span>
            <div>
              <div className="font-semibold">{formData.name || 'Nombre de plantilla'}</div>
              <div className="text-sm text-gray-500">
                {formData.defaultTitle || 'Título default'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando...' : initialData ? 'Actualizar Plantilla' : 'Crear Plantilla'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
