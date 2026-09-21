import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Restablecer Contraseña',
  description: 'Define una nueva contraseña para tu cuenta usando el enlace de recuperación.',
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
