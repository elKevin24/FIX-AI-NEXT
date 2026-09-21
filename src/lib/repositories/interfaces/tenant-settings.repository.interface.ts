export interface TenantSettingsUpdateInput {
    businessName?: string | null;
    businessNIT?: string | null;
    businessAddress?: string | null;
    businessPhone?: string | null;
    businessEmail?: string | null;
    taxRate?: number;
    taxName?: string;
    currency?: string;
    defaultPaymentTerms?: string | null;
    invoiceFooter?: string | null;
    slaWarningPercent?: number;
    slaCriticalPercent?: number;
    slaEmailEnabled?: boolean;
    slaInAppEnabled?: boolean;
}

export interface ITenantSettingsRepository {
    getSettings(): Promise<any | null>;
    updateSettings(data: TenantSettingsUpdateInput): Promise<any>;
    getTaxRate(): Promise<number>;
}
