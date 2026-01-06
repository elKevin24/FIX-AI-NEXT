/**
 * Página para visualizar Ticket 80mm
 * Ruta: /dashboard/tickets/[id]/ticket80mm
 * Muestra el ticket en formato optimizado de 80mm con opciones de descarga/compartir
 * @author Senior Fullstack Developer
 */

import { notFound } from 'next/navigation';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import TicketActions from '@/components/tickets/TicketActions';
import { Ticket80mmData } from '@/types/ticket80mm';
import Link from 'next/link';
import styles from './page.module.css';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function Ticket80mmPage({ params }: Props) {
    const { id } = await params;
    const prisma = await getTenantPrisma();

    // Obtener ticket con todas las relaciones necesarias
    const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: {
            customer: true,
            tenant: true,
            assignedTo: true,
            partsUsed: {
                include: { part: true },
            },
            services: true,
        },
    });

    if (!ticket) {
        notFound();
    }

    // Mapear datos del ticket al formato Ticket80mmData
    const ticketData: Ticket80mmData = {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        deviceType: ticket.deviceType,
        deviceModel: ticket.deviceModel,
        serialNumber: ticket.serialNumber,
        accessories: ticket.accessories,
        checkInNotes: ticket.checkInNotes,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        estimatedCompletionDate: ticket.estimatedCompletionDate,
        dueDate: ticket.dueDate,
        customer: {
            id: ticket.customer.id,
            name: ticket.customer.name,
            email: ticket.customer.email,
            phone: ticket.customer.phone,
            dpi: ticket.customer.dpi,
            nit: ticket.customer.nit,
        },
        tenant: {
            id: ticket.tenant.id,
            name: ticket.tenant.name,
        },
        assignedTo: ticket.assignedTo ? {
            id: ticket.assignedTo.id,
            name: ticket.assignedTo.name,
            email: ticket.assignedTo.email,
        } : null,
        partsUsed: ticket.partsUsed.map((pu) => ({
            id: pu.id,
            quantity: pu.quantity,
            part: {
                id: pu.part.id,
                name: pu.part.name,
                sku: pu.part.sku,
                cost: pu.part.cost.toString(),
                price: pu.part.price.toString(),
                category: pu.part.category,
            },
        })),
        services: ticket.services.map((s) => ({
            id: s.id,
            name: s.name,
            laborCost: s.laborCost.toString(),
        })),
    };

    return (
        <main className={styles.container}>
            <div className={styles.header}>
                <Link href={`/dashboard/tickets/${id}`} className={styles.backButton}>
                    ← Volver al Ticket
                </Link>
                <h1 className={styles.title}>Ticket 80mm - Orden de Servicio</h1>
                <p className={styles.subtitle}>
                    Formato optimizado para impresión térmica y compartir
                </p>
            </div>

            <div className={styles.content}>
                <TicketActions
                    ticket={ticketData}
                    showParts={true}
                    showServices={true}
                    showCostSummary={true}
                />
            </div>

            <div className={styles.instructions}>
                <h2>💡 Instrucciones</h2>
                <ul>
                    <li>
                        <strong>📷 Imagen:</strong> Descarga el ticket como imagen PNG de alta resolución
                    </li>
                    <li>
                        <strong>📄 PDF:</strong> Descarga el ticket como PDF optimizado para 80mm
                    </li>
                    <li>
                        <strong>📱 Compartir:</strong> En dispositivos móviles, comparte por WhatsApp/Telegram
                    </li>
                    <li>
                        <strong>🖨️ Imprimir:</strong> Imprime directamente en impresora térmica de 80mm
                    </li>
                </ul>
            </div>
        </main>
    );
}
