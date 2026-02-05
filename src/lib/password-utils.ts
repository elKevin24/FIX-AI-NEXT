import { z } from 'zod';

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

  const allChars = chars.upper + chars.lower + chars.numbers + chars.special;
  let password = '';

  // Garantizar al menos uno de cada tipo
  password += chars.upper[Math.floor(Math.random() * chars.upper.length)];
  password += chars.lower[Math.floor(Math.random() * chars.lower.length)];
  password += chars.numbers[Math.floor(Math.random() * chars.numbers.length)];
  password += chars.special[Math.floor(Math.random() * chars.special.length)];

  // Completar hasta 12 caracteres
  for (let i = 4; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Mezclar
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}
