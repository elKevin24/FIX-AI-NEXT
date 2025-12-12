'use client';

import { useTicketWizard, TicketDraft } from '@/hooks/useTicketWizard';
import { createBatchTickets } from '@/lib/actions';
import { useActionState } from 'react';
import { Input, Select, Textarea, Button, Card, CardHeader, CardTitle, CardBody, Alert } from '@/components/ui';
import CustomerSearch from '@/components/tickets/CustomerSearch';

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
        const wizardData = prepareFormData();
        payload.set('customerName', wizardData.get('customerName') as string);
        payload.set('tickets', wizardData.get('tickets') as string);
        formAction(payload);
    };

    return (
        <div className="max-w-4xl mx-auto">
            
            {/* --- STEPPER --- */}
            <div className="flex items-center justify-between mb-8 px-4">
                <StepIndicator step={1} current={currentStep} label="Cliente" />
                <div className="flex-1 h-px bg-slate-200 mx-4" />
                <StepIndicator step={2} current={currentStep} label="Dispositivos" />
                <div className="flex-1 h-px bg-slate-200 mx-4" />
                <StepIndicator step={3} current={currentStep} label="Confirmar" />
            </div>

            {/* --- ERROR MESSAGE --- */}
            {(error || state?.message) && (
                <Alert variant="error" className="mb-6">
                    {error || state?.message}
                </Alert>
            )}

            <form action={handleSubmit}>
                
                {/* --- STEP 1: CUSTOMER --- */}
                {currentStep === 1 && (
                    <Card className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <CardHeader>
                            <CardTitle>¿Quién es el cliente?</CardTitle>
                        </CardHeader>
                        <CardBody className="space-y-4">
                            <CustomerSearch 
                                onSelect={(c) => selectCustomer({ name: c.name, email: 'email' in c ? c.email || undefined : undefined, phone: 'phone' in c ? c.phone || undefined : undefined })}
                                selectedCustomer={customer}
                            />
                            {customer?.name && (
                                <div className="mt-4 p-4 bg-slate-50 rounded-md border border-slate-100">
                                    <p className="text-sm font-medium text-slate-700">Cliente Seleccionado:</p>
                                    <p className="text-lg font-bold text-slate-900">{customer.name}</p>
                                    {customer.email && <p className="text-sm text-slate-500">{customer.email}</p>}
                                    {customer.phone && <p className="text-sm text-slate-500">{customer.phone}</p>}
                                </div>
                            )}
                        </CardBody>
                    </Card>
                )}

                {/* --- STEP 2: DEVICES --- */}
                {currentStep === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-between items-center px-1">
                            <h2 className="text-xl font-bold text-slate-800">Equipos a Ingresar</h2>
                            <Button 
                                type="button" 
                                size="sm" 
                                onClick={addTicket}
                                variant="outline"
                            >
                                + Agregar Otro Equipo
                            </Button>
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

                {/* --- STEP 3: SUMMARY --- */}
                {currentStep === 3 && (
                    <Card className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <CardHeader>
                            <CardTitle className="text-green-700">Resumen del Ingreso</CardTitle>
                        </CardHeader>
                        <CardBody className="space-y-6">
                            <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                                <p className="text-slate-500 text-xs uppercase font-semibold mb-1">Cliente</p>
                                <p className="text-lg font-bold text-slate-900">{customer?.name}</p>
                            </div>

                            <div className="space-y-3">
                                <p className="text-slate-500 text-xs uppercase font-semibold">Dispositivos ({tickets.length})</p>
                                {tickets.map((t, i) => (
                                    <div key={i} className="bg-white p-4 rounded-md border border-slate-200 shadow-sm flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-slate-900">{t.title || 'Sin Título'}</p>
                                                <p className="text-sm text-slate-600">{t.deviceType} - {t.deviceModel || 'Sin modelo'}</p>
                                            </div>
                                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium border border-slate-200">
                                                {t.deviceType}
                                            </span>
                                        </div>
                                        {t.password && (
                                            <div className="text-sm text-red-600 font-medium bg-red-50 p-2 rounded flex items-center gap-2">
                                                🔒 Clave: {t.password}
                                            </div>
                                        )}
                                        <p className="text-sm text-slate-500 italic">"{t.description}"</p>
                                    </div>
                                ))}
                            </div>
                        </CardBody>
                    </Card>
                )}

                {/* --- NAVIGATION --- */}
                <div className="flex justify-between mt-8 pt-4">
                    {currentStep > 1 ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={prevStep}
                        >
                            Atrás
                        </Button>
                    ) : (
                        <div /> 
                    )}

                    {currentStep < 3 ? (
                        <Button
                            type="button"
                            variant="primary"
                            onClick={nextStep}
                        >
                            Siguiente
                        </Button>
                    ) : (
                        <Button
                            type="submit"
                            variant="success"
                            disabled={isPending}
                        >
                            {isPending ? 'Procesando...' : 'Confirmar Ingreso'}
                        </Button>
                    )}
                </div>

            </form>
        </div>
    );
}

// --- SUB-COMPONENTES ---

function StepIndicator({ step, current, label }: { step: number, current: number, label: string }) {
    const isActive = step === current;
    const isCompleted = step < current;
    
    return (
        <div className={`flex items-center gap-2 ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-slate-400'}`}>
            <div className={`
                w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 transition-colors
                ${isActive ? 'border-blue-600 bg-blue-50 text-blue-600' : isCompleted ? 'border-green-600 bg-green-50 text-green-600' : 'border-slate-300 bg-white text-slate-400'}
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
    const deviceTypeOptions = [
        { value: 'PC', label: 'PC / Torre' },
        { value: 'Laptop', label: 'Laptop' },
        { value: 'Smartphone', label: 'Celular' },
        { value: 'Console', label: 'Consola' },
        { value: 'Tablet', label: 'Tablet' },
        { value: 'Printer', label: 'Impresora' },
        { value: 'Other', label: 'Otro' },
    ];

    return (
        <Card className="relative group border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="absolute -top-3 -left-3 bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-md z-10 border-2 border-white">
                {index + 1}
            </div>
            
            {showRemove && (
                <button 
                    type="button"
                    onClick={onRemove}
                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-2 transition-colors"
                    title="Eliminar dispositivo"
                >
                    ✕
                </button>
            )}

            <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {/* Fila 1: Título y Tipo */}
                    <div className="md:col-span-2">
                        <Input 
                            label="Título / Problema Principal *" 
                            value={ticket.title}
                            onChange={e => onUpdate(index, 'title', e.target.value)}
                            placeholder="Ej: No enciende / Pantalla rota"
                            required
                        />
                    </div>

                    {/* Fila 2: Tipo y Modelo */}
                    <div>
                        <Select 
                            label="Tipo de Dispositivo"
                            value={ticket.deviceType || 'PC'}
                            onChange={e => onUpdate(index, 'deviceType', e.target.value)}
                            options={deviceTypeOptions}
                        />
                    </div>
                    <div>
                        <Input 
                            label="Marca / Modelo"
                            value={ticket.deviceModel || ''}
                            onChange={e => onUpdate(index, 'deviceModel', e.target.value)}
                            placeholder="Ej: Samsung Galaxy S21"
                        />
                    </div>

                    {/* Fila 3: Seguridad y Serial */}
                    <div>
                        <Input 
                            label="Contraseña / Patrón"
                            value={ticket.password || ''}
                            onChange={e => onUpdate(index, 'password', e.target.value)}
                            placeholder="Ej: 1234 o 'Z'"
                            helper="Vital para pruebas"
                            className="border-red-200 focus:border-red-400 bg-red-50/30" // Destacar campo seguridad
                        />
                    </div>
                    <div>
                        <Input 
                            label="N° Serie (Opcional)"
                            value={ticket.serialNumber || ''}
                            onChange={e => onUpdate(index, 'serialNumber', e.target.value)}
                            placeholder="SN-123456"
                        />
                    </div>

                    {/* Fila 4: Accesorios */}
                    <div className="md:col-span-2">
                        <Input 
                            label="Accesorios (Checklist)"
                            value={ticket.accessories || ''}
                            onChange={e => onUpdate(index, 'accessories', e.target.value)}
                            placeholder="Cargador, Funda, Mouse..."
                        />
                    </div>

                    {/* Fila 5: Descripción */}
                    <div className="md:col-span-2">
                        <Textarea 
                            label="Descripción Detallada *"
                            value={ticket.description}
                            onChange={e => onUpdate(index, 'description', e.target.value)}
                            rows={3}
                            placeholder="Detalles adicionales sobre la falla, comportamiento, etc."
                            required
                        />
                    </div>

                    {/* Fila 6: Estado Físico */}
                    <div className="md:col-span-2">
                        <Input 
                            label="Estado Físico (Rayones/Golpes)"
                            value={ticket.checkInNotes || ''}
                            onChange={e => onUpdate(index, 'checkInNotes', e.target.value)}
                            placeholder="Ej: Golpe en esquina superior derecha"
                        />
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}