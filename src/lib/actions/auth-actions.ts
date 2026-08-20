'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

/**
 * Authenticate user with credentials (Server Action)
 */
export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', {
      ...Object.fromEntries(formData),
      redirectTo: '/dashboard',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email-service';
import { ResetPasswordEmail } from '@/emails/ResetPasswordEmail';
import { hash } from 'bcryptjs';
import crypto from 'crypto';


export async function requestPasswordReset(formData: FormData) {
  try {
    const email = formData.get('email')?.toString();
    if (!email) return { error: 'El email es requerido' };

    // Siempre retornar éxito para prevenir Timing Attacks (enumeración de usuarios)
    // Procesamos la lógica en segundo plano (Fire-and-Forget)
    (async () => {
      try {
        const user = await prisma.user.findUnique({ where: { email } });
        
        if (user && user.role === 'ADMIN') {
          // Generar token criptográfico
          const rawToken = crypto.randomBytes(32).toString('hex');
          const hashedToken = await hash(rawToken, 10); // Guardamos el Hash en BD
          const expires = new Date(Date.now() + 3600000); // 1 hora
          
          await prisma.passwordResetToken.create({
            data: {
              email,
              token: hashedToken,
              expires
            }
          });

          // Enviamos el Raw Token en el correo
          const resetUrl = `${process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000'}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
          
          // Enviamos el correo sin "await" para no bloquear
          await sendEmail({
            to: email,
            subject: 'Restablecer contraseña - FIX Workshop',
            react: ResetPasswordEmail({ resetLink: resetUrl, userEmail: email })
          });
        }
      } catch (err) {
        console.error('Background error processing password reset:', err);
      }
    })();

    // Retorno inmediato (~10ms siempre)
    return { success: 'Si el correo corresponde a un Administrador, recibirás un enlace. Si eres empleado, contacta al dueño del taller.' };
  } catch (error) {
    console.error('Password reset request error:', error);
    return { error: 'Ocurrió un error al procesar tu solicitud.' };
  }
}

export async function resetPassword(formData: FormData) {
  try {
    const rawToken = formData.get('token')?.toString();
    const email = formData.get('email')?.toString(); // Necesitamos el correo del query params
    const password = formData.get('password')?.toString();
    
    if (!rawToken || !email || !password || password.length < 6) {
      return { error: 'Datos inválidos o el enlace está corrupto.' };
    }

    // Buscamos los tokens válidos para este correo
    const resetTokens = await prisma.passwordResetToken.findMany({
      where: { 
        email,
        expires: { gt: new Date() } // Solo tokens no expirados
      }
    });

    if (!resetTokens || resetTokens.length === 0) {
      return { error: 'El enlace de recuperación es inválido o ha expirado.' };
    }

    // Comparar hashes usando bcrypt
    const { compare } = require('bcryptjs');
    let validTokenId = null;
    
    for (const rt of resetTokens) {
      const isValid = await compare(rawToken, rt.token);
      if (isValid) {
        validTokenId = rt.id;
        break;
      }
    }

    if (!validTokenId) {
      return { error: 'El enlace de recuperación es inválido o ha expirado.' };
    }

    const hashedPassword = await hash(password, 10);

    // Actualizar usuario
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    // Eliminar todos los tokens asociados a este email para evitar re-uso
    await prisma.passwordResetToken.deleteMany({
      where: { email }
    });

    return { success: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.' };
  } catch (error) {
    console.error('Reset password error:', error);
    return { error: 'Ocurrió un error al restablecer la contraseña.' };
  }
}

