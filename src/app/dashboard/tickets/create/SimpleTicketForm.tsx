'use client';

import { useState, useActionState, useMemo } from 'react';
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
    const [step, setStep] = useState(1);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [devices, setDevices] = useState<Device[]>([{
        title: '',
        description: '',
        deviceType: 'PC',
    }]);

    const [state, formAction, isPending] = useActionState(createBatchTickets, null);

    const activeDevice = devices[0];
    const stepSummary = useMemo(() => ({
        customerLabel: customer?.name || 'Sin cliente seleccionado',
        deviceLabel: activeDevice.title || 'Sin título todavía',
    }), [customer?.name, activeDevice.title]);

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

    const handleNext = () => {
        if (step === 1 && !customer?.name) {
            return;
        }
        if (step === 2 && (!activeDevice.title.trim() || !activeDevice.description.trim())) {
            return;
        }
        setStep((current) => Math.min(current + 1, 3));
    };

    const handleBack = () => {
        setStep((current) => Math.max(current - 1, 1));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            const target = e.target as HTMLElement;
            if (target instanceof HTMLButtonElement) return;
            if (step < 3) {
                e.preventDefault();
            }
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

    return (
        <div className={styles['container']}>
            {/* --- White Cloudy Background Effects --- */}
            <div className={styles['backgroundEffects']}>
                <div className={`${styles['blob']} ${styles['blobBlue']}`} />
                <div className={`${styles['blob']} ${styles['blobPurple']}`} />
                <div className={`${styles['blob']} ${styles['blobEmerald']}`} />
            </div>

            <div className={styles['content']}>
                {/* Header Section */}
                <div className={styles['header']}>
                <h1 className={styles['title']}>
                        Nuevo Ticket
                    </h1>
                </div>

                {state?.message && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <Alert variant="error">
                            {state.message}
                        </Alert>
                    </div>
                )}

                <div className={styles['stepper']} aria-label="Progreso del ticket">
                    {[
                        { number: 1, label: 'Cliente' },
                        { number: 2, label: 'Equipo' },
                        { number: 3, label: 'Resumen' },
                    ].map((item) => (
                        <button
                            key={item.number}
                            type="button"
                            className={`${styles['stepChip']} ${step >= item.number ? styles['stepChipActive'] : ''}`}
                            onClick={() => {
                                if (item.number < step) setStep(item.number);
                            }}
                            disabled={item.number > step}
                            aria-current={step === item.number ? 'step' : undefined}
                        >
                            <span className={styles['stepChipNumber']}>{item.number}</span>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>

                <form action={handleSubmit} className={styles['form']} onKeyDown={handleKeyDown}>

                    {step === 1 && (
                    <div className={styles['glassCard']}>
                        <div className={styles['cardHeader']}>
                            <div className={styles['iconCircle']}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                            <h2 className={styles['cardTitle']}>Información del Cliente</h2>
                        </div>

                        <div className={styles['customerGrid']}>
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
                                <div className={styles['customerSelected']}>
                                    <div className={styles['checkIcon']}>
                                        <span>✓</span>
                                    </div>
                                    <div>
                                        <p className={styles['customerName']}>{customer.name}</p>
                                        {(customer.email || customer.phone || customer.nit) && (
                                            <div className={styles['customerDetail']}>
                                                {customer.email && <span style={{ display: 'block' }}>{customer.email}</span>}
                                                {customer.phone && <span style={{ display: 'block' }}>{customer.phone}</span>}
                                                {customer.dpi && <span style={{ display: 'block' }}>DPI: {customer.dpi}</span>}
                                                {customer.nit && <span style={{ display: 'block' }}>NIT: {customer.nit}</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className={styles['footerNav']}>
                            <div className={styles['footerHint']}>Paso 1 de 3: selecciona o crea el cliente.</div>
                            <Button
                                type="button"
                                variant="primary"
                                onClick={handleNext}
                                disabled={!customer?.name}
                            >
                                Continuar
                            </Button>
                        </div>
                    </div>
                    )}

                    {step === 2 && (
                    <div className={styles['glassCard']}>
                        <div className={styles['cardHeader']}>
                            <div className={styles['iconCircle']}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17l-3.5 3.5m0 0L2.75 17m3.5 3.5V3m8 0l3.5 3.5m0 0L21.75 3m-3.5.5v14" /></svg>
                            </div>
                            <h2 className={styles['cardTitle']}>Detalles del Equipo</h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className={styles['gridRow']}>
                                <Input
                                    label="Problema Principal *"
                                    value={activeDevice.title}
                                    onChange={(e) => updateDevice(0, 'title', e.target.value)}
                                    placeholder="Ej: Pantalla rota"
                                    required
                                />
                                <Select
                                    label="Tipo"
                                    value={activeDevice.deviceType}
                                    onChange={(e) => updateDevice(0, 'deviceType', e.target.value)}
                                    options={DEVICE_TYPE_OPTIONS}
                                />
                                <Input
                                    label="Marca / Modelo"
                                    value={activeDevice.deviceModel || ''}
                                    onChange={(e) => updateDevice(0, 'deviceModel', e.target.value)}
                                    placeholder="Ej: iPhone 13 Pro"
                                />
                            </div>

                            <div className={styles['extrasGrid']}>
                                <Input
                                    label="🏷️ N° Serie / IMEI"
                                    value={activeDevice.serialNumber || ''}
                                    onChange={(e) => updateDevice(0, 'serialNumber', e.target.value)}
                                    placeholder="SN-1234..."
                                />
                                <Input
                                    label="🔌 Accesorios"
                                    value={activeDevice.accessories || ''}
                                    onChange={(e) => updateDevice(0, 'accessories', e.target.value)}
                                    placeholder="Cargador, funda..."
                                />
                            </div>

                            <Textarea
                                label="Descripción Detallada *"
                                value={activeDevice.description}
                                onChange={(e) => updateDevice(0, 'description', e.target.value)}
                                rows={4}
                                placeholder="Describe los síntomas, golpes visibles, o detalles importantes..."
                                required
                            />
                        </div>

                        <div className={styles['footerNav']}>
                            <Button type="button" variant="secondary" onClick={handleBack}>
                                Atrás
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                onClick={handleNext}
                                disabled={!activeDevice.title.trim() || !activeDevice.description.trim()}
                            >
                                Continuar
                            </Button>
                        </div>
                    </div>
                    )}

                    {step === 3 && (
                    <div className={styles['glassCard']}>
                        <div className={styles['cardHeader']}>
                            <div className={styles['iconCircle']}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h2 className={styles['cardTitle']}>Resumen y Confirmación</h2>
                        </div>

                        <div className={styles['summaryCard']}>
                            <div>
                                <span className={styles['summaryLabel']}>Cliente</span>
                                <div className={styles['summaryValue']}>{stepSummary.customerLabel}</div>
                            </div>
                            <div>
                                <span className={styles['summaryLabel']}>Problema principal</span>
                                <div className={styles['summaryValue']}>{stepSummary.deviceLabel}</div>
                            </div>
                            <div>
                                <span className={styles['summaryLabel']}>Tipo de equipo</span>
                                <div className={styles['summaryValue']}>{activeDevice.deviceType}</div>
                            </div>
                            <div>
                                <span className={styles['summaryLabel']}>Modelo</span>
                                <div className={styles['summaryValue']}>{activeDevice.deviceModel || 'Sin especificar'}</div>
                            </div>
                        </div>

                        <div className={styles['summaryNotes']}>
                            <Textarea
                                label="Descripción"
                                value={activeDevice.description}
                                onChange={(e) => updateDevice(0, 'description', e.target.value)}
                                rows={4}
                                required
                            />
                            <Textarea
                                label="Notas de Estado Físico"
                                value={activeDevice.checkInNotes || ''}
                                onChange={(e) => updateDevice(0, 'checkInNotes', e.target.value)}
                                rows={2}
                                placeholder="Rayones, golpes, partes faltantes..."
                            />
                        </div>

                        <div className={styles['footerNav']}>
                            <Button type="button" variant="secondary" onClick={handleBack}>
                                Atrás
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending || !customer || devices.some(d => !d.title || !d.description)}
                                className={styles['submitBtn']}
                                isLoading={isPending}
                                variant="primary"
                            >
                                Crear Ticket
                            </Button>
                        </div>
                    </div>
                    )}

                </form>
            </div>
        </div>
    );
}
