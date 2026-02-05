'use client';

import { useState } from 'react';
import { ServiceCategory } from '@/generated/prisma';
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
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatCost = (cost: any) => {
    if (!cost) return '-';
    return `Q${Number(cost).toFixed(2)}`;
  };

  return (
    <div className={styles.container} style={{ padding: 0 }}>
      {/* Filtros Minimalistas */}
      <div className={styles.filterBar}>
        <input
          type="text"
          placeholder="Buscar servicio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as ServiceCategory | 'ALL')}
          className={styles.selectInput}
        >
          <option value="ALL">Categoría</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Lista Horizontal Minimalista */}
      <div className={styles.templateList}>
        {filteredTemplates.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No hay plantillas de servicio</p>
            <Link
              href="/dashboard/settings/service-templates/create"
              className={styles.createFirstLink}
            >
              Crear nueva
            </Link>
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`${styles.templateCard} ${!template.isActive ? styles.inactive : ''}`}
            >
              <div className={styles.cardMain}>
                <div className={styles.templateIcon} style={{ color: template.color || 'var(--color-primary-500)' }}>
                  {template.icon || '🔧'}
                </div>
                <div className={styles.cardInfo}>
                  <h3 className={styles.templateTitle}>{template.name}</h3>
                  <div className={styles.badgeGroup}>
                    <span className={styles.categoryTag}>{CATEGORY_LABELS[template.category]}</span>
                    <span>•</span>
                    <span>{template.defaultPriority}</span>
                  </div>
                </div>

                <div className={styles.infoGrid}>
                  <div className={styles.infoItem} title="Duración Estimada">
                    <span className={styles.infoLabel}>⏱</span>
                    <span>{formatDuration(template.estimatedDuration)}</span>
                  </div>
                  <div className={styles.infoItem} title="Costo de Labor">
                    <span className={styles.infoLabel}>💰</span>
                    <span>{formatCost(template.laborCost)}</span>
                  </div>
                  <div className={styles.infoItem} title="Tickets Generados">
                    <span className={styles.infoLabel}>📊</span>
                    <span>{template._count.tickets}</span>
                  </div>
                </div>
              </div>

              {/* Acciones Minimalistas (Iconos) */}
              <div className={styles.actions}>
                <Link
                  href={`/dashboard/settings/service-templates/${template.id}/edit`}
                  className={`${styles.btnIcon} ${styles.btnEdit}`}
                  title="Editar"
                >
                  <EditIcon />
                </Link>
                <button
                  onClick={() => handleDuplicate(template.id)}
                  disabled={loading === template.id}
                  className={`${styles.btnIcon}`}
                  style={{ color: 'var(--color-text-secondary)' }}
                  title="Duplicar"
                >
                  <CopyIcon />
                </button>
                <button
                  onClick={() => handleToggleActive(template.id, template.isActive)}
                  disabled={loading === template.id}
                  className={`${styles.btnIcon}`}
                  style={{ color: template.isActive ? 'var(--color-warning-600)' : 'var(--color-success-600)' }}
                  title={template.isActive ? 'Desactivar' : 'Activar'}
                >
                  {template.isActive ? <EyeOffIcon /> : <EyeIcon />}
                </button>
                <button
                  onClick={() => handleDelete(template.id, template.name)}
                  disabled={loading === template.id || template._count.tickets > 0}
                  className={`${styles.btnIcon} ${styles.btnDelete}`}
                  title={template._count.tickets > 0 ? 'Tiene tickets asociados' : 'Eliminar'}
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Minimal Icons
function EditIcon() { return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function TrashIcon() { return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>; }
function CopyIcon() { return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>; }
function EyeIcon() { return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>; }
function EyeOffIcon() { return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/></svg>; }
