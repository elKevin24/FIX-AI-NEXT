
'use client';

import { useActionState } from 'react';
import { updateSLASettings } from '@/lib/settings-actions';

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
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warning Threshold (%)</label>
                <div className="flex items-center gap-2">
                    <input 
                        type="number" 
                        name="slaWarningPercent" 
                        defaultValue={initialSettings.slaWarningPercent}
                        min="1" 
                        max="100"
                        className="p-2 border rounded w-32"
                    />
                    <span className="text-gray-500 text-sm">Alert when time used exceeds this %</span>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Critical Threshold (%)</label>
                <div className="flex items-center gap-2">
                    <input 
                        type="number" 
                        name="slaCriticalPercent" 
                        defaultValue={initialSettings.slaCriticalPercent}
                        min="1" 
                        max="100"
                        className="p-2 border rounded w-32"
                    />
                    <span className="text-gray-500 text-sm">Vital alert when time used exceeds this %</span>
                </div>
            </div>

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

            <button 
                type="submit" 
                disabled={isPending}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
                {isPending ? 'Saving...' : 'Save Configuration'}
            </button>
        </form>
    );
}
