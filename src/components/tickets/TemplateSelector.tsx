'use client';

import { useState, useEffect, useMemo } from 'react';
import { getActiveServiceTemplates } from '@/lib/service-template-actions';
import { getPartStockStatus, calculateTemplateCost, formatCurrency } from '@/lib/template-utils';
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
  MAINTENANCE: 'Mantenimiento',
  REPAIR: 'Reparación',
  UPGRADE: 'Actualización',
  DIAGNOSTIC: 'Diagnóstico',
  INSTALLATION: 'Instalación',
  CONSULTATION: 'Consultoría',
};

export default function TemplateSelector({
  onSelect,
  selectedTemplate,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesCategory = !selectedCategory || t.category === selectedCategory;
      const matchesSearch = !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.defaultTitle.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [templates, selectedCategory, searchQuery]);

  // Calculate stock status and cost for selected template
  const selectedTemplateData = useMemo(() => {
    if (!selectedTemplate) return null;

    const requiredParts = selectedTemplate.defaultParts.filter(p => p.required);
    const hasInsufficientStock = requiredParts.some(
      dp => dp.part.quantity < dp.quantity
    );

    const costBreakdown = calculateTemplateCost(
      selectedTemplate.laborCost,
      selectedTemplate.defaultParts.map(dp => ({
        price: dp.part.price,
        quantity: dp.quantity
      }))
    );

    return {
      hasInsufficientStock,
      costBreakdown,
      requiredParts: requiredParts.map(dp => ({
        ...dp,
        stockStatus: getPartStockStatus(dp.part.quantity, dp.quantity)
      })),
      optionalParts: selectedTemplate.defaultParts.filter(p => !p.required)
    };
  }, [selectedTemplate]);

  if (loading) {
    return (
      <div className={styles['container']}>
        <div className={styles['loading']}>
          <div className={styles['spinner']} />
          <p>Cargando plantillas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles['container']}>
        <div className={styles['error']}>
          <p>⚠️ {error}</p>
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className={styles['container']}>
        <div className={styles['empty']}>
          <p>📋 No hay plantillas activas disponibles</p>
          <p className={styles['emptyHint']}>
            Las plantillas ayudan a crear tickets más rápido con configuración
            predefinida.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['container']}>
      {/* Search Bar & Category Filter in single compact row */}
      <div className={styles['toolbar']}>
        <div className={styles['searchContainer']}>
          <input
            type="text"
            placeholder="🔍 Buscar plantilla..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles['searchInput']}
          />
        </div>

        <div className={styles['categories']}>
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={`${styles['categoryChip']} ${
              !selectedCategory ? styles['categoryChipActive'] : ''
            }`}
          >
            Todas ({templates.length})
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`${styles['categoryChip']} ${
                selectedCategory === category ? styles['categoryChipActive'] : ''
              }`}
            >
              {CATEGORY_LABELS[category] || category}
            </button>
          ))}
        </div>
      </div>

      {/* Template Grid - Compact */}
      <div className={styles['grid']}>
        {/* Option: No Template (Manual) */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`${styles['templateCard']} ${
            !selectedTemplate ? styles['templateCardSelected'] : ''
          }`}
        >
          <div className={styles['templateHeader']}>
            <span className={styles['templateIcon']}>✏️</span>
            <div className={styles['templateInfo']}>
              <span className={styles['templateName']}>Creación Manual</span>
              <span className={styles['templateCategory']}>Sin plantilla</span>
            </div>
          </div>
        </button>

        {/* Template Options */}
        {filteredTemplates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template)}
            className={`${styles['templateCard']} ${
              selectedTemplate?.id === template.id
                ? styles['templateCardSelected']
                : ''
            }`}
            style={
              {
                '--template-color': template.color || '#3b82f6',
              } as React.CSSProperties
            }
          >
            <div className={styles['templateHeader']}>
              <span className={styles['templateIcon']}>{template.icon || '🔧'}</span>
              <div className={styles['templateInfo']}>
                <span className={styles['templateName']}>{template.name}</span>
                <span className={styles['templateCategory']}>
                  {CATEGORY_LABELS[template.category] || template.category} {template.estimatedDuration ? `• ~${Math.round(template.estimatedDuration / 60)}h` : ''}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Selected Template Preview */}
      {selectedTemplate && selectedTemplateData && (
        <div className={styles['preview']}>
          <h4 className={styles['previewTitle']}>
            📄 Vista Previa: {selectedTemplate.name}
          </h4>

          {selectedTemplateData.hasInsufficientStock && (
            <div className={styles['warningBanner']}>
              ⚠️ Stock insuficiente para algunos repuestos requeridos
            </div>
          )}

          <div className={styles['previewContent']}>
            <div className={styles['previewRow']}>
              <strong>Título:</strong>
              <span>{selectedTemplate.defaultTitle}</span>
            </div>
            <div className={styles['previewRow']}>
              <strong>Descripción:</strong>
              <span>{selectedTemplate.defaultDescription}</span>
            </div>
            <div className={styles['previewRow']}>
              <strong>Prioridad:</strong>
              <span>{selectedTemplate.defaultPriority}</span>
            </div>

            {/* Required Parts with Stock Status */}
            {selectedTemplateData.requiredParts.length > 0 && (
              <div className={styles['previewRow']}>
                <strong>✅ Repuestos Requeridos (se consumirán automáticamente):</strong>
                <ul className={styles['partsList']}>
                  {selectedTemplateData.requiredParts.map((dp) => (
                    <li key={dp.id} className={styles['partItem']}>
                      <span>{dp.part.name} × {dp.quantity}</span>
                      <div className={styles['partBadges']}>
                        <span
                          className={`${styles['stockBadge']} ${
                            dp.stockStatus === 'insufficient' ? styles['stockInsufficient'] :
                            dp.stockStatus === 'low' ? styles['stockLow'] :
                            styles['stockSufficient']
                          }`}
                        >
                          {dp.stockStatus === 'insufficient' && '❌ Sin stock'}
                          {dp.stockStatus === 'low' && '⚠️ Stock bajo'}
                          {dp.stockStatus === 'sufficient' && '✅ Disponible'}
                          {' '}({dp.part.quantity} disponible)
                        </span>
                        <span className={styles['priceBadge']}>
                          {formatCurrency(dp.part.price * dp.quantity)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Optional Parts */}
            {selectedTemplateData.optionalParts.length > 0 && (
              <div className={styles['previewRow']}>
                <strong>💡 Repuestos Sugeridos (opcionales):</strong>
                <ul className={styles['partsList']}>
                  {selectedTemplateData.optionalParts.map((dp) => (
                    <li key={dp.id} className={styles['partItem']}>
                      <span>{dp.part.name} × {dp.quantity}</span>
                      <div className={styles['partBadges']}>
                        <span className={styles['optionalBadge']}>Opcional</span>
                        <span className={styles['stock']}>
                          Stock: {dp.part.quantity}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cost Breakdown */}
            <div className={styles['costBreakdown']}>
              <h5 className={styles['costTitle']}>💰 Costo Estimado</h5>
              <div className={styles['costRow']}>
                <span>Mano de obra:</span>
                <span>{formatCurrency(selectedTemplateData.costBreakdown.laborCost)}</span>
              </div>
              <div className={styles['costRow']}>
                <span>Repuestos:</span>
                <span>{formatCurrency(selectedTemplateData.costBreakdown.partsCost)}</span>
              </div>
              <div className={`${styles['costRow']} ${styles['costSubtotal']}`}>
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedTemplateData.costBreakdown.subtotal)}</span>
              </div>
              <div className={styles['costRow']}>
                <span>IVA (12%):</span>
                <span>{formatCurrency(selectedTemplateData.costBreakdown.tax)}</span>
              </div>
              <div className={`${styles['costRow']} ${styles['costTotal']}`}>
                <strong>TOTAL:</strong>
                <strong>{formatCurrency(selectedTemplateData.costBreakdown.total)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
