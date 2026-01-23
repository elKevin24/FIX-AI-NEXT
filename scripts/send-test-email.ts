import 'dotenv/config'; // Load env vars
import { sendEmail } from '../src/lib/email-service';

async function main() {
    const to = 'kevcordon5@gmail.com';
    console.log(`📧 Sending test email to ${to}...`);

    const result = await sendEmail({
        to,
        subject: 'Prueba de Envío FIX-AI',
        text: 'Esta es una prueba de envío desde el CLI de FIX-AI para verificar la configuración de Resend.',
        html: '<p>Esta es una <strong>prueba de envío</strong> desde el CLI de FIX-AI para verificar la configuración de Resend.</p>'
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
