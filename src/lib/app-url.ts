/**
 * Resuelve la URL base de la aplicación de forma dinámica y paramétrica:
 * 1. Parámetro explícito proporcionado por el llamador (overrideUrl).
 * 2. NEXT_PUBLIC_APP_URL configurado en variables de entorno.
 * 3. NEXTAUTH_URL configurado en variables de entorno.
 * 4. VERCEL_PROJECT_PRODUCTION_URL inyectado automáticamente por Vercel para producción.
 * 5. VERCEL_URL inyectado automáticamente por Vercel en preview deployments.
 * 6. Fallback seguro a 'http://localhost:3000' en desarrollo local.
 */
export function getBaseUrl(overrideUrl?: string): string {
  if (overrideUrl && overrideUrl.trim().length > 0) {
    return overrideUrl.trim().replace(/\/$/, '');
  }

  const appUrl = process.env['NEXT_PUBLIC_APP_URL'];
  if (appUrl && appUrl.trim().length > 0) {
    return appUrl.trim().replace(/\/$/, '');
  }

  const nextAuthUrl = process.env['NEXTAUTH_URL'];
  if (nextAuthUrl && nextAuthUrl.trim().length > 0) {
    return nextAuthUrl.trim().replace(/\/$/, '');
  }

  const vercelProd = process.env['VERCEL_PROJECT_PRODUCTION_URL'];
  if (vercelProd && vercelProd.trim().length > 0) {
    return `https://${vercelProd.trim().replace(/\/$/, '')}`;
  }

  const vercelUrl = process.env['VERCEL_URL'];
  if (vercelUrl && vercelUrl.trim().length > 0) {
    return `https://${vercelUrl.trim().replace(/\/$/, '')}`;
  }

  return 'http://localhost:3000';
}
