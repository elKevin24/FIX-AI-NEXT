'use client';

import { useState } from 'react';
import { toggleTemplateActiveStatus, deleteServiceTemplate, duplicateServiceTemplate } from '@/lib/service-template-actions';

// Define ServiceCategory locally since it may not be exported yet
enum ServiceCategory {
  MAINTENANCE = 'MAINTENANCE',
  REPAIR = 'REPAIR',
  UPGRADE = 'UPGRADE',
  DIAGNOSTIC = 'DIAGNOSTIC',
  INSTALLATION = 'INSTALLATION',
  CONSULTATION = 'CONSULTATION',
}
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Template = {
  id: string;
  name: string;
  category: ServiceCategory;
  defaultPriority: string;
  estimatedDuration: number | null;
  laborCost: any;
  isActive: boolean;
  color: string | null;
  icon: string | null;
  _count: {
    tickets: number;
  };
};

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  MAINTENANCE: 'Mantenimiento',
  REPAIR: 'Reparación',
  UPGRADE: 'Actualización',
  DIAGNOSTIC: 'Diagnóstico',
  INSTALLATION: 'Instalación',
  CONSULTATION: 'Asesoría',
};

export function ServiceTemplateList({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<ServiceCategory | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  const filteredTemplates = templates.filter((t) => {
    const matchesCategory = filter === 'ALL' || t.category === filter;
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      setLoading(id);
      await toggleTemplateActiveStatus(id, !currentStatus);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al cambiar estado');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar la plantilla "${name}"?`)) {
      return;
    }

    try {
      setLoading(id);
      await deleteServiceTemplate(id);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al eliminar');
    } finally {
      setLoading(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      setLoading(id);
      const newTemplate = await duplicateServiceTemplate(id);
      router.refresh();
      router.push(`/dashboard/settings/service-templates/${newTemplate.id}/edit`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al duplicar');
    } finally {
      setLoading(null);
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const formatCost = (cost: any) => {
    if (!cost) return '-';
    return `$${Number(cost).toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Buscar plantilla..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as ServiceCategory | 'ALL')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Todas las categorías</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista */}
      <div className="grid gap-4">
        {filteredTemplates.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">No se encontraron plantillas</p>
            <Link
              href="/dashboard/settings/service-templates/create"
              className="mt-4 inline-block text-blue-600 hover:text-blue-700"
            >
              Crear primera plantilla
            </Link>
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              style={{ borderLeft: `4px solid ${template.color || '#3B82F6'}` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{template.icon || '🔧'}</span>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {template.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm px-2 py-1 bg-gray-100 rounded-full text-gray-700">
                          {CATEGORY_LABELS[template.category]}
                        </span>
                        <span className="text-sm text-gray-500">
                          Prioridad: {template.defaultPriority}
                        </span>
                        {!template.isActive && (
                          <span className="text-sm px-2 py-1 bg-red-100 rounded-full text-red-700">
                            Inactiva
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                    <div>
                      <span className="text-gray-500">Duración:</span>
                      <span className="ml-2 font-medium">
                        {formatDuration(template.estimatedDuration)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Costo:</span>
                      <span className="ml-2 font-medium">
                        {formatCost(template.laborCost)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Tickets creados:</span>
                      <span className="ml-2 font-medium">{template._count.tickets}</span>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex flex-col gap-2 ml-4">
                  <Link
                    href={`/dashboard/settings/service-templates/${template.id}/edit`}
                    className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded border border-blue-300"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => handleToggleActive(template.id, template.isActive)}
                    disabled={loading === template.id}
                    className={`px-4 py-2 text-sm rounded border ${
                      template.isActive
                        ? 'text-yellow-700 border-yellow-300 hover:bg-yellow-50'
                        : 'text-green-700 border-green-300 hover:bg-green-50'
                    } disabled:opacity-50`}
                  >
                    {loading === template.id
                      ? 'Procesando...'
                      : template.isActive
                      ? 'Desactivar'
                      : 'Activar'}
                  </button>
                  <button
                    onClick={() => handleDuplicate(template.id)}
                    disabled={loading === template.id}
                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded border border-gray-300 disabled:opacity-50"
                  >
                    Duplicar
                  </button>
                  <button
                    onClick={() => handleDelete(template.id, template.name)}
                    disabled={loading === template.id || template._count.tickets > 0}
                    className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded border border-red-300 disabled:opacity-50"
                    title={
                      template._count.tickets > 0
                        ? 'No se puede eliminar: tiene tickets asociados'
                        : 'Eliminar plantilla'
                    }
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
