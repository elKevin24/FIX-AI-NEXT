'use client';

import { useState } from 'react';
import { updateTenantSettings, TenantSettings } from '@/lib/tenant-settings-actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import styles from './business.module.css';

interface BusinessSettingsFormProps {
    initialSettings: TenantSettings | null;
}

export default function BusinessSettingsForm({ initialSettings }: BusinessSettingsFormProps) {
    const [formData, setFormData] = useState({
        businessName: initialSettings?.businessName || '',
        businessNIT: initialSettings?.businessNIT || '',
        businessAddress: initialSettings?.businessAddress || '',
        businessPhone: initialSettings?.businessPhone || '',
        businessEmail: initialSettings?.businessEmail || '',
        taxRate: initialSettings?.taxRate ?? 12,
        taxName: initialSettings?.taxName || 'IVA',
        currency: initialSettings?.currency || 'GTQ',
        defaultPaymentTerms: initialSettings?.defaultPaymentTerms || '',
        invoiceFooter: initialSettings?.invoiceFooter || '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage(null);

        try {
            const result = await updateTenantSettings({
                businessName: formData.businessName || null,
                businessNIT: formData.businessNIT || null,
                businessAddress: formData.businessAddress || null,
                businessPhone: formData.businessPhone || null,
                businessEmail: formData.businessEmail || null,
                taxRate: formData.taxRate,
                taxName: formData.taxName,
                currency: formData.currency,
                defaultPaymentTerms: formData.defaultPaymentTerms || null,
                invoiceFooter: formData.invoiceFooter || null,
            });

            if (result.success) {
                setMessage({ type: 'success', text: 'Configuración guardada exitosamente' });
            } else {
                setMessage({ type: 'error', text: result.error || 'Error al guardar' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Error al guardar la configuración' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            {message && (
                <Alert variant={message.type === 'success' ? 'success' : 'error'}>
                    {message.text}
                </Alert>
            )}

            {/* Datos del Negocio */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Datos del Negocio</h2>
                <p className={styles.sectionDescription}>
                    Información que aparecerá en el encabezado de facturas y documentos.
                </p>

                <div className={styles.formGrid}>
                    <Input
                        label="Nombre del Negocio"
                        name="businessName"
                        value={formData.businessName}
                        onChange={handleChange}
                        placeholder="Ej: Taller de Reparaciones XYZ"
                    />

                    <Input
                        label="NIT"
                        name="businessNIT"
                        value={formData.businessNIT}
                        onChange={handleChange}
                        placeholder="Ej: 12345678-9"
                    />

                    <Input
                        label="Teléfono"
                        name="businessPhone"
                        value={formData.businessPhone}
                        onChange={handleChange}
                        placeholder="Ej: +502 1234-5678"
                    />

                    <Input
                        label="Email"
                        name="businessEmail"
                        type="email"
                        value={formData.businessEmail}
                        onChange={handleChange}
                        placeholder="Ej: contacto@taller.com"
                    />
                </div>

                <div className={styles.fullWidth}>
                    <Textarea
                        label="Dirección"
                        name="businessAddress"
                        value={formData.businessAddress}
                        onChange={handleChange}
                        placeholder="Ej: 5ta Avenida 10-20, Zona 1, Ciudad de Guatemala"
                        rows={2}
                    />
                </div>
            </section>

            {/* Configuración Fiscal */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Configuración Fiscal</h2>
                <p className={styles.sectionDescription}>
                    Configuración de impuestos y moneda para cálculos en facturas.
                </p>

                <div className={styles.formGrid}>
                    <Input
                        label="Tasa de Impuesto (%)"
                        name="taxRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.taxRate}
                        onChange={handleChange}
                    />

                    <Input
                        label="Nombre del Impuesto"
                        name="taxName"
                        value={formData.taxName}
                        onChange={handleChange}
                        placeholder="Ej: IVA"
                    />

                    <div className={styles.selectWrapper}>
                        <label className={styles.label}>Moneda</label>
                        <select
                            name="currency"
                            value={formData.currency}
                            onChange={handleChange}
                            className={styles.select}
                        >
                            <option value="GTQ">GTQ - Quetzal</option>
                            <option value="USD">USD - Dólar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="MXN">MXN - Peso Mexicano</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* Términos y Notas */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Términos y Notas</h2>
                <p className={styles.sectionDescription}>
                    Texto predeterminado que aparecerá en facturas y documentos.
                </p>

                <div className={styles.fullWidth}>
                    <Textarea
                        label="Términos de Pago por Defecto"
                        name="defaultPaymentTerms"
                        value={formData.defaultPaymentTerms}
                        onChange={handleChange}
                        placeholder="Ej: Pago al retirar el equipo. Aceptamos efectivo, tarjeta y transferencia."
                        rows={2}
                    />
                </div>

                <div className={styles.fullWidth}>
                    <Textarea
                        label="Pie de Página de Facturas"
                        name="invoiceFooter"
                        value={formData.invoiceFooter}
                        onChange={handleChange}
                        placeholder="Ej: Gracias por su preferencia. Garantía de 30 días en reparaciones."
                        rows={3}
                    />
                </div>
            </section>

            {/* Submit Button */}
            <div className={styles.actions}>
                <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Guardando...' : 'Guardar Configuración'}
                </Button>
            </div>
        </form>
    );
}
