import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { render } from '@react-email/render';
import { PartsApprovalRequiredEmail } from '../src/emails/PartsApprovalRequired';
import { sendEmail } from '../src/lib/email-service';
import { getBaseUrl } from '../src/lib/app-url';

const to = process.argv[2] || 'busqueda63@hotmail.com';
const baseUrl = getBaseUrl(process.argv[3]);

async function main() {
    console.log(`📧 Enviando email de aprobación de repuestos a ${to}...`);

    const ticketId = 'ticket_de_prueba_123';
    const token = 'token_de_prueba_abc';
    const buildLink = (action: 'approve' | 'reject') =>
        `${baseUrl}/tickets/approval?ticketId=${ticketId}&token=${token}&action=${action}`;

    const html = await render(
        PartsApprovalRequiredEmail({
            customerName: 'Kevin Cordón',
            ticketNumber: '15',
            ticketTitle: 'Reparación de pantalla rota',
            partName: 'Pantalla Samsung Galaxy S22',
            partSku: 'SCR-S22',
            quantity: 1,
            priceAtProposal: 240,
            total: 276,
            approveUrl: buildLink('approve'),
            rejectUrl: buildLink('reject'),
            ticketLink: `${baseUrl}/tickets/status/${ticketId}`,
        }),
    );

    const result = await sendEmail({
        to,
        subject: '[FIX-AI] Aprobación de repuestos - ticket #15',
        html,
    });

    if (result.success) {
        console.log('✅ Email sent successfully!');
        if (result.messageId) console.log('Message ID:', result.messageId);
        if (result.logged) console.log('(Simulated/Logged mode)');
    } else {
        console.error('❌ Failed to send email:', result.error);
    }
}

main().catch(console.error);
