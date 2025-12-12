'use client';

import { useState, useCallback } from 'react';
import { CreateTicketSchema } from '@/lib/schemas';
import { z } from 'zod';
import { createBatchTickets } from '@/lib/actions'; // Importaremos la acción, aunque la llamada final suele ser en el form

// Tipo inferido del schema de Zod para un ticket individual
// Extendemos el tipo para incluir campos locales de UI como password
export type TicketDraft = z.infer<typeof CreateTicketSchema> & {
    password?: string;
};

// Estado inicial de un ticket vacío
const INITIAL_TICKET: TicketDraft = {
    title: '',
    description: '',
    customerName: '', // Se llenará automáticamente con el cliente seleccionado
    deviceType: 'PC',
    deviceModel: '',
    serialNumber: '',
    accessories: '',
    checkInNotes: '',
    password: '',
};

type CustomerData = {
    id?: string;
    name: string;
    email?: string;
    phone?: string;
};

export function useTicketWizard() {
    // --- ESTADO ---
    const [currentStep, setCurrentStep] = useState(1);
    const [customer, setCustomer] = useState<CustomerData | null>(null);
    const [tickets, setTickets] = useState<TicketDraft[]>([{ ...INITIAL_TICKET }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- ACCIONES DE NAVEGACIÓN ---
    const nextStep = () => {
        setError(null);
        if (currentStep === 1 && !customer?.name) {
            setError('Debes seleccionar o crear un cliente para continuar.');
            return;
        }
        if (currentStep === 2 && tickets.length === 0) {
            setError('Debes agregar al menos un dispositivo.');
            return;
        }
        // Validación básica de campos requeridos en tickets antes de avanzar
        if (currentStep === 2) {
             const invalidTicket = tickets.find(t => !t.title || !t.description);
             if (invalidTicket) {
                 setError('Todos los dispositivos deben tener Título y Descripción.');
                 return;
             }
        }
        
        setCurrentStep(prev => prev + 1);
    };

    const prevStep = () => setCurrentStep(prev => Math.max(1, prev - 1));

    // --- ACCIONES DE CLIENTE ---
    const selectCustomer = (data: CustomerData) => {
        setCustomer(data);
        // Actualizar el nombre del cliente en todos los tickets actuales y futuros
        setTickets(prev => prev.map(t => ({ ...t, customerName: data.name })));
        setError(null);
    };

    // --- ACCIONES DE TICKETS (DISPOSITIVOS) ---
    const addTicket = () => {
        setTickets(prev => [
            ...prev, 
            { ...INITIAL_TICKET, customerName: customer?.name || '' }
        ]);
    };

    const removeTicket = (index: number) => {
        if (tickets.length <= 1) return; // Mínimo 1 ticket
        setTickets(prev => prev.filter((_, i) => i !== index));
    };

    const updateTicket = (index: number, field: keyof TicketDraft, value: any) => {
        setTickets(prev => prev.map((t, i) => {
            if (i === index) return { ...t, [field]: value };
            return t;
        }));
    };

    // --- SUBMIT ---
    // Esta función prepara el FormData para enviarlo a la Server Action
    const prepareFormData = () => {
        const formData = new FormData();
        formData.append('customerName', customer?.name || '');
        if (customer?.id) {
            formData.append('customerId', customer.id);
        }
        
        // Procesar tickets para incluir el password en la descripción si existe
        const processedTickets = tickets.map(t => {
            const { password, ...rest } = t;
            let finalDescription = rest.description;
            if (password && password.trim()) {
                finalDescription += `\n\n[Seguridad] Patrón/Contraseña: ${password}`;
            }
            return {
                ...rest,
                description: finalDescription
            };
        });

        formData.append('tickets', JSON.stringify(processedTickets));
        return formData;
    };

    return {
        // State
        currentStep,
        customer,
        tickets,
        error,
        isSubmitting,
        
        // Actions
        nextStep,
        prevStep,
        selectCustomer,
        addTicket,
        removeTicket,
        updateTicket,
        prepareFormData,
        setError, // Exponer para validaciones externas si es necesario
    };
}
