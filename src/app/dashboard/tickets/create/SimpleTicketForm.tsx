'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBatchTickets } from '@/lib/actions';
import { createTicketFromTemplate } from '@/lib/service-template-actions';
import { Input, Select, Textarea, Button, Alert } from '@/components/ui';
import PageHeader from '@/components/PageHeader';
import CustomerSearch from '@/components/tickets/CustomerSearch';
import TemplateSelector, { ServiceTemplate } from '@/components/tickets/TemplateSelector';
import styles from './SimpleTicketForm.module.css';

interface Customer {
    id?: string;
    name: string;
    email?: string;
    phone?: string;
    dpi?: string;
    nit?: string;
}

interface Device {
    title?: string;
    description?: string;
    deviceType?: string;
    deviceModel?: string;
    serialNumber?: string;
    accessories?: string;
    checkInNotes?: string;
}

const DEVICE_TYPE_OPTIONS = [
    { value: 'PC', label: 'PC / Computadora de Torre' },
    { value: 'Laptop', label: 'Laptop / Portátil' },
    { value: 'Smartphone', label: 'Teléfono Móvil' },
    { value: 'Console', label: 'Consola de Videojuegos' },
    { value: 'Tablet', label: 'Tablet' },
    { value: 'Printer', label: 'Impresora / Multifuncional' },
    { value: 'Other', label: 'Otro Dispositivo' },
];

export default function SimpleTicketForm() {
    const router = useRouter();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<ServiceTemplate | null>(null);
    const [devices, setDevices] = useState<Device[]>([{
        title: '',
        description: '',
        deviceType: 'PC',
    }]);
    const [error, setError] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);

    const handleTemplateChange = (template: ServiceTemplate | null) => {
        setSelectedTemplate(template);
        if (template) {
            setDevices([{
                title: template.defaultTitle,
                description: template.defaultDescription,
                deviceType: devices[0]?.deviceType || 'PC',
                deviceModel: devices[0]?.deviceModel || '',
                serialNumber: devices[0]?.serialNumber || '',
                accessories: devices[0]?.accessories || '',
                checkInNotes: devices[0]?.checkInNotes || '',
            }]);
        }
    };

    const handleSubmit = async (formData: FormData) => {
        if (!customer) return;

        setIsPending(true);
        setError(null);

        try {
            if (selectedTemplate && customer.id) {
                const templateFormData = new FormData();
                templateFormData.append('templateId', selectedTemplate.id);
                templateFormData.append('customerId', customer.id);
                if (devices[0]?.deviceType) templateFormData.append('deviceType', devices[0].deviceType);
                if (devices[0]?.deviceModel) templateFormData.append('deviceModel', devices[0].deviceModel);

                const ticket = await createTicketFromTemplate(templateFormData);
                router.push(`/dashboard/tickets/${ticket.id}`);
            } else {
                formData.set('customerName', customer.name);
                if (customer.id) formData.set('customerId', customer.id);
                if (customer.email) formData.set('customerEmail', customer.email);
                if (customer.phone) formData.set('customerPhone', customer.phone);
                if (customer.dpi) formData.set('customerDpi', customer.dpi);
                if (customer.nit) formData.set('customerNit', customer.nit);
                formData.set('tickets', JSON.stringify(devices));

                const result = await createBatchTickets(null, formData);
                if (result && result.message) {
                    setError(result.message);
                    setIsPending(false);
                    return;
                }
            }
        } catch (err: any) {
            setError(err.message || 'Error al crear el ticket');
            setIsPending(false);
        }
    };

    const addDevice = () => {
        setDevices([...devices, {
            title: '',
            description: '',
            deviceType: 'PC',
        }]);
    };

    const removeDevice = (index: number) => {
        if (devices.length > 1) {
            setDevices(devices.filter((_, i) => i !== index));
        }
    };

    const updateDevice = (index: number, field: keyof Device, value: string) => {
        const updated = [...devices];
        updated[index] = { ...updated[index], [field]: value };
        setDevices(updated);
    };

    const isSubmitDisabled = isPending || !customer || (!selectedTemplate && devices.some(d => !d.title || !d.description));

    return (
        <div className={styles['container']}>
            <div className={styles['backgroundEffects']}>
                <div className={`${styles['blob']} ${styles['blobBlue']}`} />
                <div className={`${styles['blob']} ${styles['blobPurple']}`} />
                <div className={`${styles['blob']} ${styles['blobEmerald']}`} />
            </div>

            <div className={styles['content']}>
                <PageHeader
                    title="Nuevo Ticket"
                    subtitle="Registra una nueva orden de servicio para reparación o mantenimiento"
                    actions={
                        <Button as={Link} href="/dashboard/tickets" variant="secondary" size="sm" leftIcon={<span aria-hidden="true">←</span>}>
                            Volver a Tickets
                        </Button>
                    }
                />

                {error && (
                    <div className={styles['errorWrapper']}>
                        <Alert variant="error">{error}</Alert>
                    </div>
                )}

                <form action={handleSubmit} className={styles['form']}>

                    {/* --- Template Selection --- */}
                    <div className={styles['glassCard']}>
                        <div className={styles['cardHeader']}>
                            <h2 className={styles['cardTitle']}>Tipo de Servicio</h2>
                            {selectedTemplate && (
                                <span className={styles['selectedTemplateBadge']}>
                                    {selectedTemplate.icon || '📋'} {selectedTemplate.name}
                                </span>
                            )}
                        </div>
                        <TemplateSelector
                            selectedTemplate={selectedTemplate}
                            onSelect={handleTemplateChange}
                        />
                    </div>

                    {/* --- Customer Glass Card --- */}
                    <div className={styles['glassCard']}>
                        <div className={styles['cardHeader']}>
                            <div className={styles['iconCircle']}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                            <h2 className={styles['cardTitle']}>Información del Cliente</h2>
                        </div>

                        <div className={styles['customerGrid']}>
                            <div className={styles['fullWidthCol']}>
                                <CustomerSearch
                                    onSelect={(c) => setCustomer({
                                        id: 'id' in c ? c.id : undefined,
                                        name: c.name,
                                        email: 'email' in c ? c.email || undefined : undefined,
                                        phone: 'phone' in c ? c.phone || undefined : undefined,
                                        dpi: 'dpi' in c ? c.dpi || undefined : undefined,
                                        nit: 'nit' in c ? c.nit || undefined : undefined
                                    })}
                                    selectedCustomer={customer}
                                />
                            </div>

                            {customer && !customer.id && (
                                <>
                                    <Input
                                        label="📧 Email (opcional)"
                                        type="email"
                                        placeholder="cliente@ejemplo.com"
                                        value={customer.email || ''}
                                        onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                                    />
                                    <Input
                                        label="📱 Teléfono (opcional)"
                                        type="tel"
                                        placeholder="+502 5555-1234"
                                        value={customer.phone || ''}
                                        onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                                    />
                                    <Input
                                        label="🆔 DPI (opcional)"
                                        type="text"
                                        placeholder="1234 56789 0101"
                                        value={customer.dpi || ''}
                                        onChange={(e) => setCustomer({ ...customer, dpi: e.target.value })}
                                    />
                                    <Input
                                        label="📄 NIT (opcional)"
                                        type="text"
                                        placeholder="123456-7"
                                        value={customer.nit || ''}
                                        onChange={(e) => setCustomer({ ...customer, nit: e.target.value })}
                                    />
                                </>
                            )}

                            {customer?.id && (
                                <div className={styles['customerSelected']}>
                                    <div className={styles['checkIcon']}>
                                        <span>✓</span>
                                    </div>
                                    <div>
                                        <p className={styles['customerName']}>{customer.name}</p>
                                        {(customer.email || customer.phone || customer.nit) && (
                                            <div className={styles['customerDetail']}>
                                                {customer.email && <span className={styles['customerMetaText']}>{customer.email}</span>}
                                                {customer.phone && <span className={styles['customerMetaText']}>{customer.phone}</span>}
                                                {customer.dpi && <span className={styles['customerMetaText']}>DPI: {customer.dpi}</span>}
                                                {customer.nit && <span className={styles['customerMetaText']}>NIT: {customer.nit}</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- Devices Section Header --- */}
                    <div className={styles['devicesHeader']}>
                        <div className={styles['devicesHeaderGroup']}>
                            <h2 className={styles['cardTitle']}>Dispositivos</h2>
                            <span className={styles['deviceCount']}>
                                {devices.length}
                            </span>
                        </div>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={addDevice}
                            className="rounded-full"
                        >
                            + Agregar otro Dispositivo
                        </Button>
                    </div>

                    <div className={styles['devicesList']}>
                        {devices.map((device, index) => (
                            <div key={index} className={`${styles['glassCard']} ${styles['deviceCard']}`} style={{ animationDelay: `${index * 100}ms` }}>
                                <div className={styles['deviceHeader']}>
                                    <div className={styles['deviceNumber']}>
                                        #{index + 1}
                                    </div>
                                    {devices.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeDevice(index)}
                                            className={styles['removeBtn']}
                                            title="Eliminar dispositivo"
                                        >
                                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    )}
                                </div>

                                <div className={styles['deviceFields']}>
                                    <div className={styles['gridRow']}>
                                        <Input
                                            label="Problema Principal *"
                                            value={device.title}
                                            onChange={(e) => updateDevice(index, 'title', e.target.value)}
                                            placeholder="Ej: Pantalla Rota"
                                            required
                                        />
                                        <Select
                                            label="Tipo"
                                            value={device.deviceType}
                                            onChange={(e) => updateDevice(index, 'deviceType', e.target.value)}
                                            options={DEVICE_TYPE_OPTIONS}
                                        />
                                        <Input
                                            label="Marca / Modelo"
                                            value={device.deviceModel || ''}
                                            onChange={(e) => updateDevice(index, 'deviceModel', e.target.value)}
                                            placeholder="Ej: iPhone 13 Pro"
                                        />
                                    </div>

                                    <div>
                                        <Textarea
                                            label="Descripción Detallada *"
                                            value={device.description}
                                            onChange={(e) => updateDevice(index, 'description', e.target.value)}
                                            rows={3}
                                            placeholder="Describe los síntomas, golpes visibles, o detalles importantes..."
                                            required
                                        />
                                    </div>

                                    <div className={styles['extrasGrid']}>
                                        <Input
                                            label="🏷️ N° Serie / IMEI"
                                            value={device.serialNumber || ''}
                                            onChange={(e) => updateDevice(index, 'serialNumber', e.target.value)}
                                            placeholder="SN-1234..."
                                        />
                                        <Input
                                            label="🔌 Accesorios"
                                            value={device.accessories || ''}
                                            onChange={(e) => updateDevice(index, 'accessories', e.target.value)}
                                            placeholder="Cargador, funda..."
                                        />
                                    </div>

                                    <div>
                                        <Input
                                            label="🔍 Notas de Estado Físico"
                                            value={device.checkInNotes || ''}
                                            onChange={(e) => updateDevice(index, 'checkInNotes', e.target.value)}
                                            placeholder="Rayones en tapa trasera, botón flojo..."
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer / Submit */}
                    <div className={styles['footer']}>
                        <Button
                            type="submit"
                            disabled={isSubmitDisabled}
                            className={styles['submitBtn']}
                            isLoading={isPending}
                            variant="primary"
                        >
                            Crear Ticket
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
