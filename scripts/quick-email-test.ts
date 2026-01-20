
import { Resend } from 'resend';
import * as dotenv from 'zod'; // No, use something simpler or just read env

async function testResend() {
    const key = 're_i1KWhFmH_GQB65vkyrtye3XNcSWmx4LML';
    const resend = new Resend(key);
    
    console.log('📧 Enviando correo de prueba real...');
    
    const { data, error } = await resend.emails.send({
        from: 'FIX-AI <onboarding@resend.dev>',
        to: ['kev@example.com'], // Cambiaré esto por un valor genérico o el tuyo si me lo das
        subject: 'Prueba de Integración FIX-AI',
        text: '¡Felicidades! La integración con Resend ha sido exitosa y el sistema de notificaciones está activo.'
    });

    if (error) {
        console.error('❌ Error de Resend:', error);
    } else {
        console.log('✅ Correo enviado con ID:', data?.id);
    }
}

testResend();
