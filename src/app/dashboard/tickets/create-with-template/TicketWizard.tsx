'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TemplateSelector, {
  ServiceTemplate,
} from '@/components/tickets/TemplateSelector';
import CustomerSearch from '@/components/tickets/CustomerSearch';
import { Input, Select, Textarea, Button, Alert } from '@/components/ui';
import { createTicketFromTemplate } from '@/lib/service-template-actions';
import { createBatchTickets } from '@/lib/actions';
import styles from './TicketWizard.module.css';

interface Customer {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  dpi?: string;
  nit?: string;
}

const DEVICE_TYPE_OPTIONS = [
  { value: 'PC', label: '🖥️ PC / Torre' },
  { value: 'Laptop', label: '💻 Laptop' },
  { value: 'Smartphone', label: '📱 Celular' },
  { value: 'Console', label: '🎮 Consola' },
  { value: 'Tablet', label: '📱 Tablet' },
  { value: 'Printer', label: '🖨️ Impresora' },
  { value: 'Other', label: '🔧 Otro' },
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: '🟢 Baja' },
  { value: 'MEDIUM', label: '🟡 Media' },
  { value: 'HIGH', label: '🟠 Alta' },
  { value: 'URGENT', label: '🔴 Urgente' },
];

export default function TicketWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] =
    useState<ServiceTemplate | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);

  // Ticket fields (auto-filled from template or manual)
  const [deviceType, setDeviceType] = useState('PC');
  const [deviceModel, setDeviceModel] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [serialNumber, setSerialNumber] = useState('');
  const [accessories, setAccessories] = useState('');
  const [checkInNotes, setCheckInNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Auto-fill fields when template changes
  useEffect(() => {
    if (selectedTemplate) {
      setTitle(selectedTemplate.defaultTitle);
      setDescription(selectedTemplate.defaultDescription);
      setPriority(selectedTemplate.defaultPriority);
    } else {
      // Reset to defaults when template is deselected
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
    }
  }, [selectedTemplate]);

  const handleSubmit = async () => {
    if (!customer) {
      setError('Por favor selecciona o crea un cliente');
      return;
    }

    if (!title || !description) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (selectedTemplate) {
        // Create ticket from template (with atomic stock consumption)
        const formData = new FormData();
        formData.append('templateId', selectedTemplate.id);
        if (deviceType) formData.append('deviceType', deviceType);
        if (deviceModel) formData.append('deviceModel', deviceModel);
        formData.append('customerId', customer.id!);

        const ticket = await createTicketFromTemplate(formData);

        setSuccess(true);
        setTimeout(() => {
          router.push(`/dashboard/tickets/${ticket.id}`);
        }, 1500);
      } else {
        // Manual ticket creation (original flow)
        const formData = new FormData();
        formData.set('customerName', customer.name);
        if (customer.id) formData.set('customerId', customer.id);
        if (customer.email) formData.set('customerEmail', customer.email);
        if (customer.phone) formData.set('customerPhone', customer.phone);
        if (customer.dpi) formData.set('customerDpi', customer.dpi);
        if (customer.nit) formData.set('customerNit', customer.nit);

        formData.set(
          'tickets',
          JSON.stringify([
            {
              title,
              description,
              deviceType,
              deviceModel,
              serialNumber,
              accessories,
              checkInNotes,
            },
          ])
        );

        const result = await createBatchTickets(null, formData);

        if (result && !result.message) {
          setSuccess(true);
          setTimeout(() => {
            router.push('/dashboard/tickets');
          }, 1500);
        } else {
          setError(result?.message || 'Error al crear el ticket');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado al crear el ticket');
      console.error('Error creating ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.wizard}>
        <div className={styles.header}>
          <h1 className={styles.title}>✨ Nuevo Ticket - Asistente</h1>
          <p className={styles.subtitle}>
            Crea tickets rápidamente con plantillas predefinidas o manualmente
          </p>
        </div>

        {/* Progress Steps */}
        <div className={styles.steps}>
          <div className={`${styles.step} ${step >= 1 ? styles.stepActive : ''}`}>
            <div className={styles.stepNumber}>1</div>
            <span>Plantilla</span>
          </div>
          <div className={styles.stepLine} />
          <div className={`${styles.step} ${step >= 2 ? styles.stepActive : ''}`}>
            <div className={styles.stepNumber}>2</div>
            <span>Cliente</span>
          </div>
          <div className={styles.stepLine} />
          <div className={`${styles.step} ${step >= 3 ? styles.stepActive : ''}`}>
            <div className={styles.stepNumber}>3</div>
            <span>Detalles</span>
          </div>
        </div>

        {error && (
          <Alert variant="error" className={styles.alert}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" className={styles.alert}>
            ✅ Ticket creado exitosamente. Redirigiendo...
          </Alert>
        )}

        {/* Step 1: Template Selection */}
        {step === 1 && (
          <div className={styles.stepContent}>
            <TemplateSelector
              selectedTemplate={selectedTemplate}
              onSelect={setSelectedTemplate}
            />

            <div className={styles.actions}>
              <Button
                onClick={() => setStep(2)}
                variant="primary"
                size="lg"
                disabled={false}
              >
                Continuar →
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Customer Selection */}
        {step === 2 && (
          <div className={styles.stepContent}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>👤 Información del Cliente</h2>

              <CustomerSearch
                onSelect={(c) =>
                  setCustomer({
                    id: 'id' in c ? c.id : undefined,
                    name: c.name,
                    email: 'email' in c ? c.email || undefined : undefined,
                    phone: 'phone' in c ? c.phone || undefined : undefined,
                    dpi: 'dpi' in c ? c.dpi || undefined : undefined,
                    nit: 'nit' in c ? c.nit || undefined : undefined,
                  })
                }
                selectedCustomer={customer}
              />

              {customer && !customer.id && (
                <div className={styles.newCustomerFields}>
                  <p className={styles.newCustomerHint}>
                    Completando estos campos se creará un cliente nuevo
                  </p>
                  <div className={styles.grid2}>
                    <Input
                      label="📧 Email (opcional)"
                      type="email"
                      placeholder="cliente@ejemplo.com"
                      value={customer.email || ''}
                      onChange={(e) =>
                        setCustomer({ ...customer, email: e.target.value })
                      }
                    />
                    <Input
                      label="📱 Teléfono (opcional)"
                      type="tel"
                      placeholder="12345678"
                      value={customer.phone || ''}
                      onChange={(e) =>
                        setCustomer({ ...customer, phone: e.target.value })
                      }
                    />
                    <Input
                      label="🆔 DPI (opcional)"
                      type="text"
                      placeholder="1234567890123"
                      value={customer.dpi || ''}
                      onChange={(e) =>
                        setCustomer({ ...customer, dpi: e.target.value })
                      }
                    />
                    <Input
                      label="📄 NIT (opcional)"
                      type="text"
                      placeholder="123456-7"
                      value={customer.nit || ''}
                      onChange={(e) =>
                        setCustomer({ ...customer, nit: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            <div className={styles.actions}>
              <Button onClick={() => setStep(1)} variant="secondary" size="lg">
                ← Atrás
              </Button>
              <Button
                onClick={() => setStep(3)}
                variant="primary"
                size="lg"
                disabled={!customer}
              >
                Continuar →
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Ticket Details */}
        {step === 3 && (
          <div className={styles.stepContent}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>🔧 Detalles del Ticket</h2>

              <div className={styles.grid2}>
                <Select
                  label="Tipo de Dispositivo"
                  options={DEVICE_TYPE_OPTIONS}
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                />
                <Input
                  label="Modelo"
                  type="text"
                  placeholder="Ej: Dell Inspiron 15"
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                />
              </div>

              <Input
                label="Título del Ticket"
                type="text"
                required
                placeholder="Ej: Reparación de pantalla rota"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <Textarea
                label="Descripción del Problema"
                required
                placeholder="Describe el problema en detalle..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className={styles.grid2}>
                <Input
                  label="Número de Serie (opcional)"
                  type="text"
                  placeholder="SN123456"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                />
                <Select
                  label="Prioridad"
                  options={PRIORITY_OPTIONS}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                />
              </div>

              <Input
                label="Accesorios Entregados (opcional)"
                type="text"
                placeholder="Ej: Cargador, mouse, teclado"
                value={accessories}
                onChange={(e) => setAccessories(e.target.value)}
              />

              <Textarea
                label="Notas de Recepción (opcional)"
                placeholder="Condiciones físicas, daños visibles, etc."
                rows={3}
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
              />

              {selectedTemplate && selectedTemplate.defaultParts.length > 0 && (
                <div className={styles.templateInfo}>
                  <h3>📦 Partes de la Plantilla</h3>
                  <ul className={styles.partsList}>
                    {selectedTemplate.defaultParts.map((dp) => (
                      <li key={dp.id}>
                        <span className={styles.partName}>{dp.part.name}</span>
                        <span className={styles.partQty}>
                          Cantidad: {dp.quantity}
                        </span>
                        {dp.required && (
                          <span className={styles.requiredBadge}>
                            ✓ Requerido (se consumirá stock)
                          </span>
                        )}
                        {!dp.required && (
                          <span className={styles.optionalBadge}>
                            Sugerido (sin consumo)
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className={styles.actions}>
              <Button onClick={() => setStep(2)} variant="secondary" size="lg">
                ← Atrás
              </Button>
              <Button
                onClick={handleSubmit}
                variant="primary"
                size="lg"
                disabled={loading || !title || !description}
              >
                {loading ? 'Creando...' : '✅ Crear Ticket'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
