'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import { createBatchTickets } from '@/lib/actions';
import { Input, Select, Textarea, Button, Alert } from '@/components/ui';
import CustomerSearch from '@/components/tickets/CustomerSearch';
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
    title: string;
    description: string;
    deviceType: string;
    deviceModel?: string;
    serialNumber?: string;
    accessories?: string;
    checkInNotes?: string;
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

export default function SimpleTicketForm() {
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [devices, setDevices] = useState<Device[]>([{
        title: '',
        description: '',
        deviceType: 'PC',
    }]);

    const [state, formAction, isPending] = useActionState(createBatchTickets, null);

    const handleSubmit = (formData: FormData) => {
        if (!customer) return;

        formData.set('customerName', customer.name);
        if (customer.id) {
            formData.set('customerId', customer.id);
        }
        if (customer.email) {
            formData.set('customerEmail', customer.email);
        }
        if (customer.phone) {
            formData.set('customerPhone', customer.phone);
        }
        if (customer.dpi) {
            formData.set('customerDpi', customer.dpi);
        }
        if (customer.nit) {
            formData.set('customerNit', customer.nit);
        }
        formData.set('tickets', JSON.stringify(devices));
        formAction(formData);
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

    return (
        <div className={styles.container}>
            {/* --- White Cloudy Background Effects --- */}
            <div className={styles.backgroundEffects}>
                <div className={`${styles.blob} ${styles.blobBlue}`} />
                <div className={`${styles.blob} ${styles.blobPurple}`} />
                <div className={`${styles.blob} ${styles.blobEmerald}`} />
            </div>

            <div className={styles.content}>
                {/* Header Section */}
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        Nuevo Ticket
                    </h1>
                </div>

                {state?.message && (
                    <Alert variant="error" className="mb-6">
                        {state.message}
                    </Alert>
                )}

                <form action={handleSubmit} className={styles.form}>

                    {/* --- Customer Glass Card --- */}
                    <div className={styles.glassCard}>
                        <div className={styles.cardHeader}>
                            <div className={styles.iconCircle}>
                                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                            <h2 className={styles.cardTitle}>Información del Cliente</h2>
                        </div>

                        <div className={styles.customerGrid}>
                            <div style={{ gridColumn: '1 / -1' }}>
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
                                <div className={styles.customerSelected}>
                                    <div className={styles.checkIcon}>
                                        <span>✓</span>
                                    </div>
                                    <div>
                                        <p className={styles.customerName}>{customer.name}</p>
                                        {(customer.email || customer.phone || customer.nit) && (
                                            <div className={styles.customerDetail}>
                                                {customer.email && <span className="block">{customer.email}</span>}
                                                {customer.phone && <span className="block">{customer.phone}</span>}
                                                {customer.dpi && <span className="block">DPI: {customer.dpi}</span>}
                                                {customer.nit && <span className="block">NIT: {customer.nit}</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- Devices Section Header --- */}
                    <div className={styles.devicesHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                            <h2 className={styles.cardTitle} style={{ fontSize: '1.125rem', fontWeight: '600' }}>Dispositivos</h2>
                            <span className={styles.deviceCount}>
                                {devices.length}
                            </span>
                        </div>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={addDevice}
                            style={{ borderRadius: '999px' }}
                        >
                            + Agregar otro Dispositivo
                        </Button>
                    </div>

                    <div>
                        {devices.map((device, index) => (
                            <div key={index} className={`${styles.glassCard} ${styles.deviceCard}`} style={{ animationDelay: `${index * 100}ms` }}>
                                <div className={styles.deviceHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div className={styles.deviceNumber}>
                                            #{index + 1}
                                        </div>
                                    </div>
                                    {devices.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeDevice(index)}
                                            className={styles.removeBtn}
                                            title="Eliminar dispositivo"
                                        >
                                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {/* Row 1 */}
                                    <div className={styles.gridRow}>
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

                                    {/* Row 2: Description */}
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

                                    {/* Row 3: Extras */}
                                    <div className={styles.extrasGrid}>
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

                                    {/* Row 4: Physical State */}
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
                    <div className={styles.footer}>
                        <Button
                            type="submit"
                            disabled={isPending || !customer || devices.some(d => !d.title || !d.description)}
                            className={styles.submitBtn}
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
