'use client';

import { useActionState } from 'react';
import { updateSLASettings } from '@/lib/settings-actions';
import { Button, Input, Alert } from '@/components/ui';
import styles from '@/components/ui/Form.module.css';

interface Settings {
    slaWarningPercent: number;
    slaCriticalPercent: number;
    slaEmailEnabled: boolean;
    slaInAppEnabled: boolean;
}

export default function SLASettingsForm({ initialSettings }: { initialSettings: Settings }) {
    const [state, action, isPending] = useActionState(updateSLASettings, null);

    return (
        <form action={action} className="space-y-4">
            {state?.message && (
                <Alert variant={state.success ? 'success' : 'error'}>
                    {state.message}
                </Alert>
            )}

            <Input 
                label="Warning Threshold (%)"
                type="number" 
                name="slaWarningPercent" 
                defaultValue={initialSettings.slaWarningPercent}
                min="1" 
                max="100"
                helper="Alert when time used exceeds this %"
            />

            <Input 
                label="Critical Threshold (%)"
                type="number" 
                name="slaCriticalPercent" 
                defaultValue={initialSettings.slaCriticalPercent}
                min="1" 
                max="100"
                helper="Vital alert when time used exceeds this %"
            />

            <div className="space-y-2">
                <div className={styles['checkboxGroup']} style={{ margin: '0.5rem 0' }}>
                    <label className={styles['checkboxLabel']}>
                        <input 
                            type="checkbox" 
                            name="slaEmailEnabled" 
                            id="slaEmailEnabled"
                            defaultChecked={initialSettings.slaEmailEnabled}
                            className={styles['checkboxInput']}
                        />
                        <span>Enable Email Notifications</span>
                    </label>
                </div>

                <div className={styles['checkboxGroup']} style={{ margin: '0.5rem 0' }}>
                    <label className={styles['checkboxLabel']}>
                        <input 
                            type="checkbox" 
                            name="slaInAppEnabled" 
                            id="slaInAppEnabled"
                            defaultChecked={initialSettings.slaInAppEnabled}
                            className={styles['checkboxInput']}
                        />
                        <span>Enable In-App Notifications</span>
                    </label>
                </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
                <Button 
                    type="submit" 
                    variant="primary"
                    size="sm"
                    isLoading={isPending}
                    disabled={isPending}
                >
                    Guardar Configuración SLA
                </Button>
            </div>
        </form>
    );
}
