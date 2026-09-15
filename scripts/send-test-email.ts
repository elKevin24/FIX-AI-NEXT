import 'dotenv/config'; // Load env vars
import { sendEmail } from '../src/lib/email-service';

async function main() {
    const to = process.argv[2] || process.env['TEST_EMAIL_TO'] || 'kevcordon5@gmail.com';
    console.log(`📧 Preparando envío de correo de prueba a: ${to}...`);
    console.log(`⚙️  Proveedor configurado: ${process.env['EMAIL_PROVIDER'] || (process.env['SMTP_HOST'] ? 'smtp' : 'log')}`);
    if (process.env['SMTP_HOST']) {
        console.log(`🌐 Servidor SMTP: ${process.env['SMTP_HOST']}:${process.env['SMTP_PORT'] || 587}`);
        console.log(`👤 Usuario SMTP: ${process.env['SMTP_USER'] || 'no configurado'}`);
    }

    const result = await sendEmail({
        to,
        subject: 'Prueba de Envío FIX-AI - Sistema de Notificaciones',
        text: `Hola,\n\nEste es un correo de prueba enviado desde el sistema FIX-AI para verificar la operatividad del servicio de notificaciones.\n\nFecha y hora: ${new Date().toLocaleString('es-ES')}\nDestinatario: ${to}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #2563eb; margin-top: 0;">FIX-AI - Notificaciones</h2>
                <p>Hola,</p>
                <p>Este es un correo de prueba enviado desde el sistema <strong>FIX-AI</strong> para verificar la conectividad y el formato del servicio de notificaciones.</p>
                <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 16px 0;">
                    <p style="margin: 4px 0;"><strong>Destinatario:</strong> ${to}</p>
                    <p style="margin: 4px 0;"><strong>Fecha y hora:</strong> ${new Date().toLocaleString('es-ES')}</p>
                    <p style="margin: 4px 0;"><strong>Estado:</strong> Verificación de servicio de correo</p>
                </div>
                <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">Este mensaje fue generado automáticamente por FIX-AI Workshop Management System.</p>
            </div>
        `
    });

    if (result.success) {
        console.log('✅ Correo de prueba procesado exitosamente!');
        if (result.messageId) console.log('📨 ID del mensaje SMTP:', result.messageId);
        if (result.logged) console.log('📝 Modo de simulación (EMAIL_PROVIDER=log activo). El mensaje se registró en los registros del servidor.');
    } else {
        console.error('❌ Error al enviar el correo:', result.error);
    }
}

main().catch(console.error);
