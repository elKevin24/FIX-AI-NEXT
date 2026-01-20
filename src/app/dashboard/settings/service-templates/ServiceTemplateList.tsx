'use client';

import { useState } from 'react';
import { ServiceCategory } from '@prisma/client';
import { toggleTemplateActiveStatus, deleteServiceTemplate, duplicateServiceTemplate } from '@/lib/service-template-actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './service-templates.module.css';

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
    // Fixed: Using Q instead of $ for consistency
    return `Q${Number(cost).toFixed(2)}`;
  };

  return (
    <div className={styles.container}>
      {/* Filtros */}
      <div className={styles.glassCard}>
        <div className={styles.filterBar}>
          <input
            type="text"
            placeholder="Buscar plantilla..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as ServiceCategory | 'ALL')}
            className={styles.selectInput}
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
      <div className={styles.templateList}>
        {filteredTemplates.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No se encontraron plantillas</p>
            <Link
              href="/dashboard/settings/service-templates/create"
              className={styles.createFirstLink}
            >
              Crear primera plantilla
            </Link>
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={styles.templateCard}
              style={{ borderLeft: `6px solid ${template.color || 'var(--color-primary-500)'}` }}
            >
              <div className={styles.cardMain}>
                <div className={styles.cardHeader}>
                  <div className={styles.templateIcon}>
                    {template.icon || '🔧'}
                  </div>
                  <div>
                    <h3 className={styles.templateTitle}>
                      {template.name}
                    </h3>
                    <div className={styles.badgeGroup}>
                      <span className={`${styles.badge} ${styles.badgeCategory}`}>
                        {CATEGORY_LABELS[template.category]}
                      </span>
                      <span className={styles.infoLabel} style={{ textTransform: 'none' }}>
                        Prioridad: <strong>{template.defaultPriority}</strong>
                      </span>
                      {!template.isActive && (
                        <span className={`${styles.badge} ${styles.badgeInactive}`}>
                          Inactiva
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Duración</span>
                    <span className={styles.infoValue}>
                      {formatDuration(template.estimatedDuration)}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Costo Labor</span>
                    <span className={styles.infoValue}>
                      {formatCost(template.laborCost)}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Uso Histórico</span>
                    <span className={styles.infoValue}>{template._count.tickets} tickets</span>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className={styles.actions}>
                <Link
                  href={`/dashboard/settings/service-templates/${template.id}/edit`}
                  className={`${styles.btn} ${styles.btnEdit}`}
                >
                  Editar
                </Link>
                <button
                  onClick={() => handleToggleActive(template.id, template.isActive)}
                  disabled={loading === template.id}
                  className={`${styles.btn} ${template.isActive ? styles.btnDeactivate : styles.btnActivate}`}
                >
                  {loading === template.id
                    ? '...'
                    : template.isActive
                    ? 'Desactivar'
                    : 'Activar'}
                </button>
                <button
                  onClick={() => handleDuplicate(template.id)}
                  disabled={loading === template.id}
                  className={`${styles.btn} ${styles.btnDuplicate}`}
                >
                  Duplicar
                </button>
                <button
                  onClick={() => handleDelete(template.id, template.name)}
                  disabled={loading === template.id || template._count.tickets > 0}
                  className={`${styles.btn} ${styles.btnDelete}`}
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
          ))
        )}
      </div>
    </div>
  );
}