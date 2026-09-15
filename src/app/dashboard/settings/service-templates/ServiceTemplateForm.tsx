'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ServiceCategory } from '@/generated/prisma';
import { createServiceTemplate, updateServiceTemplate } from '@/lib/service-template-actions';
import styles from './ServiceTemplateForm.module.css';

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
      const data = new FormData();
      data.append('name', formData.name);
      data.append('category', formData.category);
      data.append('defaultTitle', formData.defaultTitle);
      data.append('defaultDescription', formData.defaultDescription);
      data.append('defaultPriority', formData.defaultPriority);
      if (formData.estimatedDuration !== null) {
        data.append('estimatedDuration', formData.estimatedDuration.toString());
      }
      if (formData.laborCost !== null) {
        data.append('laborCost', formData.laborCost.toString());
      }
      data.append('isActive', String(formData.isActive));
      if (formData.color) data.append('color', formData.color);
      if (formData.icon) data.append('icon', formData.icon);

      if (initialData?.id) {
        await updateServiceTemplate(initialData.id, data);
      } else {
        await createServiceTemplate(data);
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
    <form onSubmit={handleSubmit} className={styles.container}>
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {/* Nombre */}
      <div className={styles.formGroup}>
        <label className={styles.label}>
          Nombre de la Plantilla *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={styles.input}
          placeholder="Ej: Mantenimiento Básico PC"
        />
      </div>

      {/* Categoría */}
      <div className={styles.formGroup}>
        <label className={styles.label}>
          Categoría *
        </label>
        <div className={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => handleCategoryChange(cat.value as ServiceCategory)}
              className={`${styles.categoryBtn} ${
                formData.category === cat.value ? styles.active : ''
              }`}
            >
              <div className={styles.categoryIcon}>{cat.icon}</div>
              <div className={styles.categoryLabel}>{cat.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Título Default */}
      <div className={styles.formGroup}>
        <label className={styles.label}>
          Título Default para Tickets *
        </label>
        <input
          type="text"
          required
          value={formData.defaultTitle}
          onChange={(e) => setFormData({ ...formData, defaultTitle: e.target.value })}
          className={styles.input}
          placeholder="Ej: Mantenimiento preventivo de PC"
        />
        <p className={styles.helpText}>
          Este será el título que se usará al crear tickets con esta plantilla
        </p>
      </div>

      {/* Descripción/Checklist */}
      <div className={styles.formGroup}>
        <label className={styles.label}>
          Descripción / Checklist *
        </label>
        <textarea
          required
          value={formData.defaultDescription}
          onChange={(e) => setFormData({ ...formData, defaultDescription: e.target.value })}
          rows={10}
          className={`${styles.textarea} ${styles.input}`}
          placeholder="Checklist de mantenimiento:&#10;- Limpieza interna de polvo&#10;- Revisión de ventiladores&#10;- Aplicación de pasta térmica&#10;- ..."
        />
        <p className={styles.helpText}>
          Usa viñetas (-) para crear un checklist
        </p>
      </div>

      {/* Prioridad Default */}
      <div className={styles.formGroup}>
        <label className={styles.label}>
          Prioridad Default *
        </label>
        <select
          value={formData.defaultPriority}
          onChange={(e) => setFormData({ ...formData, defaultPriority: e.target.value })}
          className={styles.select}
        >
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
      </div>

      {/* Duración Estimada */}
      <div className={styles.formGroup}>
        <label className={styles.label}>
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
          className={styles.input}
          placeholder="60"
        />
        <p className={styles.helpText}>
          {formData.estimatedDuration && formData.estimatedDuration >= 60
            ? `≈ ${Math.floor(formData.estimatedDuration / 60)}h ${
                formData.estimatedDuration % 60
              }min`
            : ''}
        </p>
      </div>

      {/* Costo de Mano de Obra */}
      <div className={styles.formGroup}>
        <label className={styles.label}>
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
          className={styles.input}
          placeholder="350.00"
        />
      </div>

      {/* Color e Icono */}
      <div className={styles.gridTwo}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Color</label>
          <input
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className={styles.input}
            style={{ height: '3rem', padding: '0.25rem' }}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Icono</label>
          <input
            type="text"
            maxLength={10}
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            className={styles.input}
            placeholder="🔧"
            style={{ fontSize: '1.5rem', textAlign: 'center' }}
          />
        </div>
      </div>

      {/* Estado Activo */}
      <div className={styles.checkboxGroup}>
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className={styles.checkbox}
        />
        <label htmlFor="isActive" className={styles.label} style={{ marginBottom: 0 }}>
          Plantilla activa (visible para crear tickets)
        </label>
      </div>

      {/* Vista Previa */}
      <div className={styles.previewCard}>
        <h3 className={styles.label}>Vista Previa</h3>
        <div
          className={styles.previewInner}
          style={{ borderLeftColor: formData.color }}
        >
          <div className={styles.previewContent}>
            <span className={styles.previewIcon}>{formData.icon}</span>
            <div>
              <div className={styles.previewTitle}>{formData.name || 'Nombre de plantilla'}</div>
              <div className={styles.previewSubtitle}>
                {formData.defaultTitle || 'Título default'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className={styles.actions}>
        <button
          type="submit"
          disabled={loading}
          className={styles.submitBtn}
        >
          {loading ? 'Guardando...' : initialData ? 'Actualizar Plantilla' : 'Crear Plantilla'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className={styles.cancelBtn}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}