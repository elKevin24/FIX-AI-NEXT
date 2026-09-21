'use client';

import { useActionState } from 'react';
import { updateSLASettings } from '@/lib/settings-actions';
import { Button, Input } from '@/components/ui';

interface Settings {
    slaWarningPercent: number;
    slaCriticalPercent: number;
    slaEmailEnabled: boolean;
    slaInAppEnabled: boolean;
}

export default function SLASettingsForm({ initialSettings }: { initialSettings: Settings }) {
    const [state, action, isPending] = useActionState(updateSLASettings, null);

    return (
        <form action={action} className="space-y-6">
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

            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        name="slaEmailEnabled" 
                        id="slaEmailEnabled"
                        defaultChecked={initialSettings.slaEmailEnabled}
                        className="h-4 w-4 text-blue-600 rounded"
                    />
                    <label htmlFor="slaEmailEnabled" className="text-sm font-medium text-gray-700">Enable Email Notifications</label>
                </div>

                <div className="flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        name="slaInAppEnabled" 
                        id="slaInAppEnabled"
                        defaultChecked={initialSettings.slaInAppEnabled}
                        className="h-4 w-4 text-blue-600 rounded"
                    />
                    <label htmlFor="slaInAppEnabled" className="text-sm font-medium text-gray-700">Enable In-App Notifications</label>
                </div>
            </div>

            {state?.message && (
                <div className={`p-3 rounded text-sm ${state.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {state.message}
                </div>
            )}

            <Button 
                type="submit" 
                variant="primary"
                size="sm"
                isLoading={isPending}
            >
                Guardar Configuración SLA
            </Button>
        </form>
    );
}
