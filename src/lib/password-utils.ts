import { z } from 'zod';
import crypto from 'crypto';

/**
 * Política de contraseñas:
 * - Mínimo 8 caracteres
 * - Al menos una mayúscula
 * - Al menos una minúscula
 * - Al menos un número
 * - Al menos un carácter especial
 */
export const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
};

export const passwordSchema = z
  .string()
  .min(PASSWORD_POLICY.minLength, `Mínimo ${PASSWORD_POLICY.minLength} caracteres`)
  .refine(
    (val) => !PASSWORD_POLICY.requireUppercase || /[A-Z]/.test(val),
    'Debe contener al menos una mayúscula'
  )
  .refine(
    (val) => !PASSWORD_POLICY.requireLowercase || /[a-z]/.test(val),
    'Debe contener al menos una minúscula'
  )
  .refine(
    (val) => !PASSWORD_POLICY.requireNumber || /\d/.test(val),
    'Debe contener al menos un número'
  )
  .refine(
    (val) => !PASSWORD_POLICY.requireSpecial || /[!@#$%^&*(),.?":{}|<>]/.test(val),
    'Debe contener al menos un carácter especial (!@#$%^&*...)'
  );

/**
 * Valida una contraseña contra la política
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const result = passwordSchema.safeParse(password);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  return {
    valid: false,
    errors: result.error.errors.map((e) => e.message),
  };
}

/**
 * Genera una contraseña temporal segura
 */
export function generateTemporaryPassword(): string {
  const chars = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    special: '!@#$%&*',
  };

  const getRandomChar = (str: string) => str[crypto.randomInt(0, str.length)];
  const allChars = chars.upper + chars.lower + chars.numbers + chars.special;

  const passArray = [
    getRandomChar(chars.upper),
    getRandomChar(chars.lower),
    getRandomChar(chars.numbers),
    getRandomChar(chars.special),
  ];

  for (let i = 4; i < 12; i++) {
    passArray.push(getRandomChar(allChars));
  }

  // Mezclar con Fisher-Yates seguro
  for (let i = passArray.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [passArray[i], passArray[j]] = [passArray[j], passArray[i]];
  }

  return passArray.join('');
}
