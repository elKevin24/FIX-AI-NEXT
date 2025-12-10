'use client';

import { useTicketWizard, TicketDraft } from '@/hooks/useTicketWizard';
import { createBatchTickets } from '@/lib/actions';
import { useActionState } from 'react';
import styles from '../tickets.module.css'; // Usaremos los estilos existentes por ahora

export default function TicketWizard() {
    const {
        currentStep,
        customer,
        tickets,
        error,
        nextStep,
        prevStep,
        selectCustomer,
        addTicket,
        removeTicket,
        updateTicket,
        prepareFormData
    } = useTicketWizard();

    // Server Action hook para el envío final
    const [state, formAction, isPending] = useActionState(createBatchTickets, null);

    // Wrapper para el submit que inyecta los datos del wizard en el FormData
    const handleSubmit = (payload: FormData) => {
        // Obtenemos los datos preparados por el hook
        const wizardData = prepareFormData();
        
        // Copiamos los datos al payload que recibe el Server Action
        // (Aunque useActionState maneja el form, necesitamos inyectar nuestro JSON manual)
        payload.set('customerName', wizardData.get('customerName') as string);
        payload.set('tickets', wizardData.get('tickets') as string);
        
        formAction(payload);
    };

    return (
        <div className="max-w-4xl mx-auto bg-slate-900 p-6 rounded-lg shadow-xl text-white">
            
            {/* --- STEPPER (INDICADOR DE PASOS) --- */}
            <div className="flex items-center justify-between mb-8 border-b border-slate-700 pb-4">
                <StepIndicator step={1} current={currentStep} label="Cliente" />
                <div className="flex-1 h-1 bg-slate-700 mx-4" />
                <StepIndicator step={2} current={currentStep} label="Dispositivos" />
                <div className="flex-1 h-1 bg-slate-700 mx-4" />
                <StepIndicator step={3} current={currentStep} label="Confirmar" />
            </div>

            {/* --- MENSAJES DE ERROR --- */}
            {(error || state?.message) && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-6">
                    ⚠️ {error || state?.message}
                </div>
            )}

            <form action={handleSubmit}>
                
                {/* --- PASO 1: CLIENTE --- */}
                {currentStep === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-xl font-bold text-blue-400">¿Quién es el cliente?</h2>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-slate-400">Nombre Completo</label>
                            <input
                                type="text"
                                className="p-3 rounded bg-slate-800 border border-slate-600 focus:border-blue-500 outline-none text-white"
                                placeholder="Ej: Juan Pérez"
                                value={customer?.name || ''}
                                onChange={(e) => selectCustomer({ name: e.target.value })}
                                autoFocus
                            />
                            <p className="text-xs text-slate-500">
                                Si el cliente no existe, se creará automáticamente.
                            </p>
                        </div>
                    </div>
                )}

                {/* --- PASO 2: DISPOSITIVOS --- */}
                {currentStep === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-blue-400">Equipos a Ingresar</h2>
                            <button 
                                type="button" 
                                onClick={addTicket}
                                className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded transition-colors"
                            >
                                + Agregar Otro Equipo
                            </button>
                        </div>

                        {tickets.map((ticket, index) => (
                            <DeviceCard 
                                key={index} 
                                index={index} 
                                ticket={ticket} 
                                onUpdate={updateTicket} 
                                onRemove={() => removeTicket(index)}
                                showRemove={tickets.length > 1}
                            />
                        ))}
                    </div>
                )}

                {/* --- PASO 3: RESUMEN --- */}
                {currentStep === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-xl font-bold text-green-400">Resumen del Ingreso</h2>
                        
                        <div className="bg-slate-800 p-4 rounded border border-slate-700">
                            <p className="text-slate-400 text-sm">Cliente</p>
                            <p className="text-lg font-medium">{customer?.name}</p>
                        </div>

                        <div className="space-y-3">
                            <p className="text-slate-400 text-sm">Dispositivos ({tickets.length})</p>
                            {tickets.map((t, i) => (
                                <div key={i} className="bg-slate-800 p-3 rounded border border-slate-700 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-white">{t.title || 'Sin Título'}</p>
                                        <p className="text-sm text-slate-400">{t.deviceType} - {t.deviceModel}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded">
                                            {t.accessories ? 'Con Accesorios' : 'Solo Equipo'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- BOTONES DE NAVEGACIÓN --- */}
                <div className="flex justify-between mt-8 pt-4 border-t border-slate-700">
                    {currentStep > 1 ? (
                        <button
                            type="button"
                            onClick={prevStep}
                            className="px-6 py-2 rounded border border-slate-600 hover:bg-slate-800 text-slate-300 transition-colors"
                        >
                            Atrás
                        </button>
                    ) : (
                        <div /> /* Spacer */
                    )}

                    {currentStep < 3 ? (
                        <button
                            type="button"
                            onClick={nextStep}
                            className="px-6 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
                        >
                            Siguiente
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={isPending}
                            className="px-8 py-2 rounded bg-green-600 hover:bg-green-500 text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isPending ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                                    Procesando...
                                </>
                            ) : (
                                'Confirmar Ingreso'
                            )}
                        </button>
                    )}
                </div>

            </form>
        </div>
    );
}

// --- SUB-COMPONENTES DE UI ---

function StepIndicator({ step, current, label }: { step: number, current: number, label: string }) {
    const isActive = step === current;
    const isCompleted = step < current;
    
    return (
        <div className={`flex items-center gap-2 ${isActive ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-slate-500'}`}>
            <div className={`
                w-8 h-8 rounded-full flex items-center justify-center font-bold border-2
                ${isActive ? 'border-blue-400 bg-blue-900/20' : isCompleted ? 'border-green-400 bg-green-900/20' : 'border-slate-600 bg-slate-800'}
            `}>
                {isCompleted ? '✓' : step}
            </div>
            <span className="text-sm font-medium hidden sm:block">{label}</span>
        </div>
    );
}

function DeviceCard({ 
    index, 
    ticket, 
    onUpdate, 
    onRemove, 
    showRemove 
}: { 
    index: number, 
    ticket: TicketDraft, 
    onUpdate: (i: number, f: keyof TicketDraft, v: any) => void,
    onRemove: () => void,
    showRemove: boolean
}) {
    return (
        <div className="bg-slate-800 p-4 rounded border border-slate-700 relative group">
            <div className="absolute -top-3 -left-3 bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                #{index + 1}
            </div>
            
            {showRemove && (
                <button 
                    type="button"
                    onClick={onRemove}
                    className="absolute top-2 right-2 text-slate-500 hover:text-red-400 p-1"
                    title="Eliminar dispositivo"
                >
                    ✕
                </button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {/* Título (Resumen del problema) */}
                <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Título / Problema Principal *</label>
                    <input 
                        type="text" 
                        value={ticket.title}
                        onChange={e => onUpdate(index, 'title', e.target.value)}
                        className="w-full p-2 rounded bg-slate-900 border border-slate-600 focus:border-blue-500 outline-none"
                        placeholder="Ej: No enciende / Pantalla rota"
                    />
                </div>

                {/* Tipo y Modelo */}
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Tipo</label>
                    <select 
                        value={ticket.deviceType || 'PC'}
                        onChange={e => onUpdate(index, 'deviceType', e.target.value)}
                        className="w-full p-2 rounded bg-slate-900 border border-slate-600 outline-none"
                    >
                        <option value="PC">PC / Torre</option>
                        <option value="Laptop">Laptop</option>
                        <option value="Smartphone">Celular</option>
                        <option value="Console">Consola</option>
                        <option value="Tablet">Tablet</option>
                        <option value="Printer">Impresora</option>
                        <option value="Other">Otro</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Modelo / Marca</label>
                    <input 
                        type="text" 
                        value={ticket.deviceModel || ''}
                        onChange={e => onUpdate(index, 'deviceModel', e.target.value)}
                        className="w-full p-2 rounded bg-slate-900 border border-slate-600 outline-none"
                        placeholder="Ej: Dell Inspiron 15"
                    />
                </div>

                {/* Serial y Accesorios */}
                <div>
                    <label className="block text-xs text-slate-400 mb-1">N° Serie (Opcional)</label>
                    <input 
                        type="text" 
                        value={ticket.serialNumber || ''}
                        onChange={e => onUpdate(index, 'serialNumber', e.target.value)}
                        className="w-full p-2 rounded bg-slate-900 border border-slate-600 outline-none"
                        placeholder="SN-123456"
                    />
                </div>
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Accesorios (Checklist)</label>
                    <input 
                        type="text" 
                        value={ticket.accessories || ''}
                        onChange={e => onUpdate(index, 'accessories', e.target.value)}
                        className="w-full p-2 rounded bg-slate-900 border border-slate-600 outline-none"
                        placeholder="Cargador, Funda, Mouse..."
                    />
                </div>

                {/* Descripción y Notas Físicas */}
                <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Descripción Detallada *</label>
                    <textarea 
                        value={ticket.description}
                        onChange={e => onUpdate(index, 'description', e.target.value)}
                        rows={2}
                        className="w-full p-2 rounded bg-slate-900 border border-slate-600 focus:border-blue-500 outline-none"
                        placeholder="Detalles adicionales sobre la falla..."
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Estado Físico (Rayones/Golpes)</label>
                    <input 
                        type="text" 
                        value={ticket.checkInNotes || ''}
                        onChange={e => onUpdate(index, 'checkInNotes', e.target.value)}
                        className="w-full p-2 rounded bg-slate-900 border border-slate-600 outline-none"
                        placeholder="Ej: Golpe en esquina superior derecha"
                    />
                </div>
            </div>
        </div>
    );
}
