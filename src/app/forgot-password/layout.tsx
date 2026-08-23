import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Recuperar Contraseña',
  description: 'Solicita un enlace para restablecer la contraseña de tu cuenta.',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
