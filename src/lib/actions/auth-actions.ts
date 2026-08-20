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

    // Verificamos si existe el usuario
    const user = await prisma.user.findUnique({ where: { email } });
    
    // Por seguridad, no revelamos si el email existe o no si no lo encontramos
    if (user) {
      // Generar token seguro
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 3600000); // 1 hora
      
      await prisma.passwordResetToken.create({
        data: {
          email,
          token,
          expires
        }
      });

      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
      
      await sendEmail({
        to: email,
        subject: 'Restablecer contraseña - FIX Workshop',
        react: ResetPasswordEmail({ resetLink: resetUrl, userEmail: email })
      });
    }

    return { success: 'Si el correo existe en nuestro sistema, recibirás un enlace de recuperación.' };
  } catch (error) {
    console.error('Password reset request error:', error);
    return { error: 'Ocurrió un error al procesar tu solicitud.' };
  }
}

export async function resetPassword(formData: FormData) {
  try {
    const token = formData.get('token')?.toString();
    const password = formData.get('password')?.toString();
    
    if (!token || !password || password.length < 6) {
      return { error: 'Datos inválidos. La contraseña debe tener al menos 6 caracteres.' };
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token }
    });

    if (!resetToken || resetToken.expires < new Date()) {
      return { error: 'El enlace de recuperación es inválido o ha expirado.' };
    }

    const hashedPassword = await hash(password, 10);

    // Actualizar usuario
    await prisma.user.update({
      where: { email: resetToken.email },
      data: { password: hashedPassword }
    });

    // Eliminar token usado
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id }
    });

    return { success: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.' };
  } catch (error) {
    console.error('Reset password error:', error);
    return { error: 'Ocurrió un error al restablecer la contraseña.' };
  }
}
