'use client';

import { useState, useEffect } from 'react';
import { getActiveServiceTemplates } from '@/lib/service-template-actions';
import styles from './TemplateSelector.module.css';

export type ServiceTemplate = {
  id: string;
  name: string;
  category: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultPriority: string;
  estimatedDuration: number | null;
  laborCost: number | null;
  color: string | null;
  icon: string | null;
  defaultParts: Array<{
    id: string;
    quantity: number;
    required: boolean;
    part: {
      id: string;
      name: string;
      sku: string | null;
      quantity: number;
      price: number;
    };
  }>;
};

interface TemplateSelectorProps {
  onSelect: (template: ServiceTemplate | null) => void;
  selectedTemplate: ServiceTemplate | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  MAINTENANCE: '🔧 Mantenimiento',
  REPAIR: '🔨 Reparación',
  UPGRADE: '⬆️ Actualización',
  DIAGNOSTIC: '🔍 Diagnóstico',
  INSTALLATION: '💿 Instalación',
  CONSULTATION: '💬 Consultoría',
};

export default function TemplateSelector({
  onSelect,
  selectedTemplate,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    async function loadTemplates() {
      try {
        setLoading(true);
        const data = await getActiveServiceTemplates();
        setTemplates(data as any);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Error al cargar plantillas');
        console.error('Error loading templates:', err);
      } finally {
        setLoading(false);
      }
    }

    loadTemplates();
  }, []);

  const categories = Array.from(new Set(templates.map((t) => t.category)));

  const filteredTemplates = selectedCategory
    ? templates.filter((t) => t.category === selectedCategory)
    : templates;

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Cargando plantillas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>⚠️ {error}</p>
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <p>📋 No hay plantillas activas disponibles</p>
          <p className={styles.emptyHint}>
            Las plantillas ayudan a crear tickets más rápido con configuración
            predefinida.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          ✨ Selecciona una Plantilla (Opcional)
        </h3>
        <p className={styles.subtitle}>
          Las plantillas pre-configuran el ticket con título, descripción y
          partes recomendadas
        </p>
      </div>

      {/* Category Filter */}
      <div className={styles.categories}>
        <button
          type="button"
          onClick={() => setSelectedCategory(null)}
          className={`${styles.categoryChip} ${
            !selectedCategory ? styles.categoryChipActive : ''
          }`}
        >
          Todas ({templates.length})
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            className={`${styles.categoryChip} ${
              selectedCategory === category ? styles.categoryChipActive : ''
            }`}
          >
            {CATEGORY_LABELS[category] || category} (
            {templates.filter((t) => t.category === category).length})
          </button>
        ))}
      </div>

      {/* Template Grid */}
      <div className={styles.grid}>
        {/* Option: No Template (Manual) */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`${styles.templateCard} ${
            !selectedTemplate ? styles.templateCardSelected : ''
          }`}
        >
          <div className={styles.templateIcon}>✏️</div>
          <div className={styles.templateInfo}>
            <h4 className={styles.templateName}>Sin Plantilla</h4>
            <p className={styles.templateCategory}>Creación manual</p>
            <p className={styles.templateDescription}>
              Completa todos los campos manualmente
            </p>
          </div>
        </button>

        {/* Template Options */}
        {filteredTemplates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template)}
            className={`${styles.templateCard} ${
              selectedTemplate?.id === template.id
                ? styles.templateCardSelected
                : ''
            }`}
            style={
              {
                '--template-color': template.color || '#3B82F6',
              } as React.CSSProperties
            }
          >
            <div className={styles.templateIcon}>
              {template.icon || '🔧'}
            </div>
            <div className={styles.templateInfo}>
              <h4 className={styles.templateName}>{template.name}</h4>
              <p className={styles.templateCategory}>
                {CATEGORY_LABELS[template.category] || template.category}
              </p>
              <p className={styles.templateDescription}>
                {template.defaultTitle}
              </p>
              {template.defaultParts.length > 0 && (
                <div className={styles.templateParts}>
                  <span className={styles.partsCount}>
                    {template.defaultParts.length} parte(s)
                  </span>
                  {template.defaultParts.some((p) => p.required) && (
                    <span className={styles.requiredBadge}>Requiere stock</span>
                  )}
                </div>
              )}
              {template.estimatedDuration && (
                <span className={styles.duration}>
                  ⏱️ ~{Math.round(template.estimatedDuration / 60)}h
                </span>
              )}
            </div>
            {selectedTemplate?.id === template.id && (
              <div className={styles.checkmark}>✓</div>
            )}
          </button>
        ))}
      </div>

      {/* Selected Template Preview */}
      {selectedTemplate && (
        <div className={styles.preview}>
          <h4 className={styles.previewTitle}>
            📄 Vista Previa: {selectedTemplate.name}
          </h4>
          <div className={styles.previewContent}>
            <div className={styles.previewRow}>
              <strong>Título:</strong>
              <span>{selectedTemplate.defaultTitle}</span>
            </div>
            <div className={styles.previewRow}>
              <strong>Descripción:</strong>
              <span>{selectedTemplate.defaultDescription}</span>
            </div>
            <div className={styles.previewRow}>
              <strong>Prioridad:</strong>
              <span>{selectedTemplate.defaultPriority}</span>
            </div>
            {selectedTemplate.defaultParts.length > 0 && (
              <div className={styles.previewRow}>
                <strong>Partes:</strong>
                <ul className={styles.partsList}>
                  {selectedTemplate.defaultParts.map((dp) => (
                    <li key={dp.id}>
                      {dp.part.name} - Cantidad: {dp.quantity}
                      {dp.required && (
                        <span className={styles.requiredBadge}>
                          ✓ Requerido
                        </span>
                      )}
                      {!dp.required && (
                        <span className={styles.optionalBadge}>
                          Sugerido
                        </span>
                      )}
                      <span className={styles.stock}>
                        (Stock: {dp.part.quantity})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
