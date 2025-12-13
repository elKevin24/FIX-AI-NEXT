'use client';

import { useTicketWizard, TicketDraft } from '@/hooks/useTicketWizard';
import { createBatchTickets } from '@/lib/actions';
import { useActionState, useState } from 'react';
import { Input, Select, Textarea, Button, Card, CardHeader, CardTitle, CardBody, Alert } from '@/components/ui';
import CustomerSearch from '@/components/tickets/CustomerSearch';

// Iconos para tipos de dispositivo
const DEVICE_ICONS: Record<string, string> = {
    'PC': '🖥️',
    'Laptop': '💻',
    'Smartphone': '📱',
    'Console': '🎮',
    'Tablet': '📱',
    'Printer': '🖨️',
    'Other': '🔧',
};

export default function TicketWizard() {
    const {
        currentStep,
        customer,
        tickets,
        error,
        nextStep,
        prevStep,
        goToStep,
        selectCustomer,
        addTicket,
        duplicateTicket,
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
        if (wizardData.has('customerId')) {
            payload.set('customerId', wizardData.get('customerId') as string);
        }
        // Agregar email y phone del cliente si existen
        if (customer?.email) {
            payload.set('customerEmail', customer.email);
        }
        if (customer?.phone) {
            payload.set('customerPhone', customer.phone);
        }
        payload.set('tickets', wizardData.get('tickets') as string);
        formAction(payload);
    };

    // Prevent implicit submission on Enter key (except for Textarea)
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-4">

            {/* --- STEPPER --- */}
            <div className="flex items-start justify-center gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm border border-slate-200 sticky top-4 z-20">
                <StepIndicator step={1} current={currentStep} label="Cliente" onClick={() => currentStep > 1 && goToStep(1)} />
                <div className="flex-1 flex items-center pt-5">
                    <div className={`h-1 w-full rounded-full transition-colors duration-500 ${currentStep > 1 ? 'bg-green-500' : 'bg-slate-200'}`} />
                </div>
                <StepIndicator step={2} current={currentStep} label="Dispositivos" onClick={() => currentStep > 2 && goToStep(2)} />
                <div className="flex-1 flex items-center pt-5">
                    <div className={`h-1 w-full rounded-full transition-colors duration-500 ${currentStep > 2 ? 'bg-green-500' : 'bg-slate-200'}`} />
                </div>
                <StepIndicator step={3} current={currentStep} label="Confirmar" />
            </div>

            {/* --- ERROR MESSAGE --- */}
            {(error || state?.message) && (
                <Alert variant="error" className="mb-3 animate-in slide-in-from-top-2">
                    {error || state?.message}
                </Alert>
            )}

            <form action={handleSubmit} onKeyDown={handleKeyDown}>
                
                {/* --- STEP 1: CUSTOMER --- */}
                {currentStep === 1 && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Header del paso */}
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-3 text-white shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                    <span className="text-2xl">👤</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Paso 1: Información del Cliente</h2>
                                    <p className="text-blue-100 text-sm">Selecciona o crea un nuevo cliente</p>
                                </div>
                            </div>
                        </div>

                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">Buscar Cliente</CardTitle>
                            </CardHeader>
                            <CardBody className="space-y-4">
                                <CustomerSearch
                                    onSelect={(c) => selectCustomer({
                                        id: 'id' in c ? c.id : undefined,
                                        name: c.name,
                                        email: 'email' in c ? c.email || undefined : undefined,
                                        phone: 'phone' in c ? c.phone || undefined : undefined
                                    })}
                                    selectedCustomer={customer}
                                />
                                {customer?.name && (
                                    <div className="mt-3 space-y-2">
                                        {/* Cliente existente */}
                                        {customer.id && (
                                            <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 shadow-sm animate-in fade-in duration-300">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <span className="text-white text-xl">✓</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs uppercase font-bold text-green-700 mb-1">Cliente Existente</p>
                                                        <p className="text-lg font-bold text-slate-900">{customer.name}</p>
                                                        {customer.email && <p className="text-sm text-slate-600">📧 {customer.email}</p>}
                                                        {customer.phone && <p className="text-sm text-slate-600">📱 {customer.phone}</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Cliente nuevo - formulario */}
                                        {!customer.id && (
                                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                <p className="text-sm font-semibold text-blue-900 mb-2">Nuevo Cliente: {customer.name}</p>
                                                <div className="space-y-2">
                                                    <Input
                                                        label="Email (opcional)"
                                                        type="email"
                                                        placeholder="cliente@ejemplo.com"
                                                        value={customer.email || ''}
                                                        onChange={(e) => selectCustomer({ ...customer, email: e.target.value })}
                                                    />
                                                    <Input
                                                        label="Teléfono (opcional)"
                                                        type="tel"
                                                        placeholder="5555-1234 o +502 5555-1234"
                                                        value={customer.phone || ''}
                                                        onChange={(e) => selectCustomer({ ...customer, phone: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardBody>
                        </Card>

                        {/* Hint para el usuario */}
                        {!customer?.name && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                                <div className="text-blue-500 text-xl">💡</div>
                                <div>
                                    <p className="text-sm text-blue-900 font-semibold">Consejo</p>
                                    <p className="text-sm text-blue-800">
                                        Escribe el nombre, teléfono o email del cliente. Si no existe, podrás crearlo automáticamente.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- STEP 2: DEVICES --- */}
                {currentStep === 2 && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Header del paso */}
                        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-3 text-white shadow-sm sticky top-[100px] z-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                        <span className="text-2xl">📱</span>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold">Paso 2: Dispositivos</h2>
                                        <p className="text-purple-100 text-sm">{tickets.length} equipo{tickets.length > 1 ? 's' : ''} agregado{tickets.length > 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={addTicket}
                                    className="bg-white text-purple-600 hover:bg-purple-50 flex items-center gap-2 shadow-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Agregar Equipo
                                </Button>
                            </div>
                        </div>

                        {tickets.map((ticket, index) => (
                            <DeviceCard 
                                key={index} 
                                index={index} 
                                ticket={ticket} 
                                onUpdate={updateTicket} 
                                onRemove={() => removeTicket(index)}
                                onDuplicate={() => duplicateTicket(index)}
                                showRemove={tickets.length > 1}
                            />
                        ))}
                        
                        <div className="flex justify-center pt-2">
                             <Button
                                type="button"
                                variant="outline"
                                onClick={addTicket}
                                className="border-dashed border-2 border-slate-300 text-slate-500 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 w-full py-4 flex flex-col items-center gap-1 h-auto"
                            >
                                <span className="text-2xl">+</span>
                                <span>Agregar otro dispositivo</span>
                            </Button>
                        </div>
                    </div>
                )}

                {/* --- STEP 3: SUMMARY --- */}
                {currentStep === 3 && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Header del resumen */}
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-3 text-white shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                    <span className="text-2xl">✓</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Paso 3: Confirmar Ingreso</h2>
                                    <p className="text-green-100 text-sm">Revisa toda la información antes de confirmar</p>
                                </div>
                            </div>
                        </div>

                        {/* Información del Cliente */}
                        <Card className="border-slate-200 shadow-sm relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-2">
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => goToStep(1)}
                                    className="text-blue-600 hover:bg-blue-50 text-xs"
                                >
                                    ✏️ Editar
                                </Button>
                            </div>
                            <CardBody>
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                                        <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs uppercase font-semibold text-slate-500 mb-1">Cliente</p>
                                        <p className="text-xl font-bold text-slate-900">{customer?.name}</p>
                                        {customer?.email && <p className="text-sm text-slate-600">📧 {customer.email}</p>}
                                        {customer?.phone && <p className="text-sm text-slate-600">📱 {customer.phone}</p>}
                                    </div>
                                    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                                        ✓ Confirmado
                                    </div>
                                </div>
                            </CardBody>
                        </Card>

                        {/* Lista de Dispositivos */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <span className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-bold">
                                        {tickets.length}
                                    </span>
                                    Dispositivo{tickets.length > 1 ? 's' : ''} a Ingresar
                                </h3>
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => goToStep(2)}
                                    className="text-purple-600 hover:bg-purple-50 text-xs flex items-center gap-1"
                                >
                                    ✏️ Editar Dispositivos
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {tickets.map((t, i) => {
                                    const deviceIcon = DEVICE_ICONS[t.deviceType || 'PC'] || '🔧';
                                    return (
                                        <Card key={i} className="border-slate-200 shadow-md hover:shadow-lg transition-shadow">
                                            <CardBody>
                                                <div className="flex gap-4">
                                                    {/* Icono del dispositivo */}
                                                    <div className="flex-shrink-0">
                                                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                                                            <span className="text-3xl">{deviceIcon}</span>
                                                        </div>
                                                        <div className="text-center mt-1">
                                                            <span className="text-xs font-bold text-slate-600">#{i + 1}</span>
                                                        </div>
                                                    </div>

                                                    {/* Detalles */}
                                                    <div className="flex-1 space-y-3">
                                                        {/* Header */}
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="text-lg font-bold text-slate-900">{t.title || 'Sin Título'}</h4>
                                                                <p className="text-sm text-slate-600">{t.deviceType} {t.deviceModel && `• ${t.deviceModel}`}</p>
                                                            </div>
                                                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                                                                {t.deviceType}
                                                            </span>
                                                        </div>

                                                        {/* Descripción */}
                                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                            <p className="text-sm text-slate-700 italic">&ldquo;{t.description}&rdquo;</p>
                                                        </div>

                                                        {/* Detalles adicionales */}
                                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                                            {t.password && (
                                                                <div className="col-span-2 bg-red-50 border border-red-200 p-2 rounded-lg flex items-center gap-2">
                                                                    <span className="text-red-600 font-semibold">🔒 Contraseña:</span>
                                                                    <code className="bg-white px-2 py-1 rounded text-red-700 font-mono">{t.password}</code>
                                                                </div>
                                                            )}
                                                            {t.serialNumber && (
                                                                <div className="bg-slate-100 p-2 rounded flex items-center gap-2">
                                                                    <span className="font-semibold text-slate-700">🏷️ S/N:</span>
                                                                    <span className="text-slate-600">{t.serialNumber}</span>
                                                                </div>
                                                            )}
                                                            {t.accessories && (
                                                                <div className="bg-slate-100 p-2 rounded flex items-center gap-2">
                                                                    <span className="font-semibold text-slate-700">📦</span>
                                                                    <span className="text-slate-600 text-xs">{t.accessories}</span>
                                                                </div>
                                                            )}
                                                            {t.checkInNotes && (
                                                                <div className="col-span-2 bg-amber-50 border border-amber-200 p-2 rounded flex items-center gap-2">
                                                                    <span className="font-semibold text-amber-800">🔍 Estado:</span>
                                                                    <span className="text-amber-700 text-xs">{t.checkInNotes}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardBody>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Nota final */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                            <div className="text-blue-600 text-xl">ℹ️</div>
                            <div className="flex-1">
                                <p className="text-sm text-blue-900 font-semibold mb-1">Antes de confirmar</p>
                                <p className="text-sm text-blue-800">
                                    Verifica que toda la información sea correcta. Una vez confirmado, se creará{tickets.length > 1 ? 'n' : ''} {tickets.length} ticket{tickets.length > 1 ? 's' : ''} de servicio.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- NAVIGATION --- */}
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200 sticky bottom-0 bg-white p-4 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    {currentStep > 1 ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={prevStep}
                            className="flex items-center gap-2 hover:bg-slate-50 transition-all duration-200"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
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
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
                        >
                            Siguiente
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Button>
                    ) : (
                        <Button
                            type="submit"
                            variant="success"
                            disabled={isPending}
                            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPending ? (
                                <>
                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Confirmar Ingreso
                                </>
                            )}
                        </Button>
                    )}
                </div>

            </form>
        </div>
    );
}

// --- SUB-COMPONENTES ---

function StepIndicator({ step, current, label, onClick }: { step: number, current: number, label: string, onClick?: () => void }) {
    const isActive = step === current;
    const isCompleted = step < current;
    const isClickable = isCompleted || step === current;

    return (
        <div 
            className={`flex flex-col items-center gap-2 ${isClickable ? 'cursor-pointer' : ''}`}
            onClick={isClickable ? onClick : undefined}
        >
            <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-300
                ${isActive
                    ? 'border-blue-600 bg-blue-600 text-white shadow-md scale-110'
                    : isCompleted
                        ? 'border-green-600 bg-green-600 text-white shadow-md'
                        : 'border-slate-300 bg-white text-slate-400'}
            `}>
                {isCompleted ? '✓' : step}
            </div>
            <div className="text-center">
                <p className={`text-xs font-semibold ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-slate-400'}`}>
                    {label}
                </p>
                {isActive && <p className="text-[10px] text-slate-500 mt-0.5 animate-pulse">Actual</p>}
            </div>
        </div>
    );
}

function DeviceCard({
    index,
    ticket,
    onUpdate,
    onRemove,
    onDuplicate,
    showRemove
}: {
    index: number,
    ticket: TicketDraft,
    onUpdate: (i: number, f: keyof TicketDraft, v: any) => void,
    onRemove: () => void,
    onDuplicate: () => void,
    showRemove: boolean
}) {
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    const deviceTypeOptions = [
        { value: 'PC', label: '🖥️ PC / Torre' },
        { value: 'Laptop', label: '💻 Laptop' },
        { value: 'Smartphone', label: '📱 Celular' },
        { value: 'Console', label: '🎮 Consola' },
        { value: 'Tablet', label: '📱 Tablet' },
        { value: 'Printer', label: '🖨️ Impresora' },
        { value: 'Other', label: '🔧 Otro' },
    ];

    // Validación en tiempo real
    const validateField = (field: string, value: string) => {
        const errors = { ...validationErrors };

        if (field === 'title' && !value.trim()) {
            errors.title = 'El título es requerido';
        } else if (field === 'title') {
            delete errors.title;
        }

        if (field === 'description' && !value.trim()) {
            errors.description = 'La descripción es requerida';
        } else if (field === 'description') {
            delete errors.description;
        }

        setValidationErrors(errors);
    };

    const handleFieldChange = (field: keyof TicketDraft, value: any) => {
        onUpdate(index, field, value);
        validateField(field, value);
    };

    const currentIcon = DEVICE_ICONS[ticket.deviceType || 'PC'] || '🔧';
    const isValid = ticket.title && ticket.description;

    return (
        <Card className="relative group border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            {/* Badge del número con icono del dispositivo */}
            <div className="absolute -top-4 -left-4 bg-gradient-to-br from-blue-600 to-blue-700 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-lg z-10 border-3 border-white">
                <span className="text-2xl">{currentIcon}</span>
            </div>

            {/* Indicador de número */}
            <div className="absolute -top-2 -right-2 bg-slate-700 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md z-10">
                {index + 1}
            </div>

            {/* Botones de acción */}
            <div className="absolute top-3 right-3 flex gap-2">
                 <button
                    type="button"
                    onClick={onDuplicate}
                    className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-all duration-200"
                    title="Duplicar dispositivo"
                >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
                {showRemove && (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-all duration-200 hover:scale-110"
                        title="Eliminar dispositivo"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Indicador de validación */}
            {isValid && (
                <div className="absolute top-3 right-20 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    <span>✓</span>
                    Completo
                </div>
            )}

            <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 pt-3">
                    {/* Fila 1: Título */}
                    <div className="md:col-span-2">
                        <div className="relative">
                            <Input
                                label="Título / Problema Principal *"
                                value={ticket.title}
                                onChange={e => handleFieldChange('title', e.target.value)}
                                placeholder="Ej: No enciende / Pantalla rota"
                                required
                                className={validationErrors.title ? 'border-red-300' : ticket.title ? 'border-green-300' : ''}
                            />
                            {validationErrors.title && (
                                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                    <span>⚠️</span> {validationErrors.title}
                                </p>
                            )}
                            {ticket.title && !validationErrors.title && (
                                <div className="absolute top-8 right-3 text-green-600 text-lg">
                                    ✓
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Fila 2: Tipo y Modelo */}
                    <div>
                        <Select
                            label="Tipo de Dispositivo"
                            value={ticket.deviceType || 'PC'}
                            onChange={e => handleFieldChange('deviceType', e.target.value)}
                            options={deviceTypeOptions}
                        />
                    </div>
                    <div>
                        <Input
                            label="Marca / Modelo"
                            value={ticket.deviceModel || ''}
                            onChange={e => handleFieldChange('deviceModel', e.target.value)}
                            placeholder="Ej: Samsung Galaxy S21"
                        />
                    </div>

                    {/* Fila 3: Seguridad y Serial */}
                    <div>
                        <div className="relative">
                            <Input
                                label="🔒 Contraseña / Patrón"
                                value={ticket.password || ''}
                                onChange={e => handleFieldChange('password', e.target.value)}
                                placeholder="Ej: 1234 o 'Z'"
                                helper="⚠️ Vital para pruebas del dispositivo"
                                className="border-red-200 focus:border-red-400 bg-red-50/30"
                            />
                        </div>
                    </div>
                    <div>
                        <Input
                            label="N° Serie (Opcional)"
                            value={ticket.serialNumber || ''}
                            onChange={e => handleFieldChange('serialNumber', e.target.value)}
                            placeholder="SN-123456"
                        />
                    </div>

                    {/* Fila 4: Accesorios */}
                    <div className="md:col-span-2">
                        <Input
                            label="📦 Accesorios Incluidos"
                            value={ticket.accessories || ''}
                            onChange={e => handleFieldChange('accessories', e.target.value)}
                            placeholder="Ej: Cargador, Funda, Mouse, Cable HDMI..."
                        />
                    </div>

                    {/* Fila 5: Descripción */}
                    <div className="md:col-span-2">
                        <div className="relative">
                            <Textarea
                                label="Descripción Detallada *"
                                value={ticket.description}
                                onChange={e => handleFieldChange('description', e.target.value)}
                                rows={3}
                                placeholder="Describe el problema en detalle: síntomas, cuándo ocurrió, qué estaba haciendo el usuario..."
                                required
                                className={validationErrors.description ? 'border-red-300' : ticket.description ? 'border-green-300' : ''}
                            />
                            {validationErrors.description && (
                                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                    <span>⚠️</span> {validationErrors.description}
                                </p>
                            )}
                            <div className="text-xs text-slate-500 mt-1 flex justify-between">
                                <span>{ticket.description?.length || 0} caracteres</span>
                                {ticket.description && !validationErrors.description && (
                                    <span className="text-green-600 font-semibold">✓ Descripción válida</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Fila 6: Estado Físico */}
                    <div className="md:col-span-2">
                        <Input
                            label="🔍 Estado Físico del Dispositivo"
                            value={ticket.checkInNotes || ''}
                            onChange={e => handleFieldChange('checkInNotes', e.target.value)}
                            placeholder="Ej: Golpe en esquina superior derecha, rayones en pantalla, batería abombada..."
                        />
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}