
import { notifyTicketStatusChange, notifyTechnicianAssigned } from '../src/lib/ticket-notifications';
import { prisma } from '../src/lib/prisma';

async function testNotifications() {
    console.log('🚀 Iniciando prueba de notificaciones...');

    // 1. Obtener un ticket real para la prueba
    const ticket = await prisma.ticket.findFirst({
        include: {
            customer: true,
            assignedTo: true,
            tenant: true,
        }
    });

    if (!ticket) {
        console.error('❌ No hay tickets en la DB para probar.');
        return;
    }

    console.log(`📦 Usando Ticket: #${ticket.id.slice(0, 8)} - ${ticket.title}`);

    // 2. Probar Notificación de Asignación
    console.log('📧 Probando notificación de asignación...');
    await notifyTechnicianAssigned(
        {
            ...ticket,
            ticketNumber: (ticket as any).ticketNumber || ticket.id.slice(0, 8),
        } as any,
        'Administrador de Pruebas'
    );

    // 3. Probar Notificación de Cambio de Estado
    console.log('📧 Probando notificación de cambio de estado...');
    await notifyTicketStatusChange(
        {
            ...ticket,
            ticketNumber: (ticket as any).ticketNumber || ticket.id.slice(0, 8),
        } as any,
        { oldStatus: 'OPEN', newStatus: 'IN_PROGRESS' }
    );

    console.log('✅ Pruebas completadas. Revisa tu inbox o logs de correo.');
}

testNotifications()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
