import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Iniciar Sesión',
  description: 'Accede al panel de administración de FIX Workshop para gestionar tickets, clientes e inventario de tu taller.',
  openGraph: {
    title: 'Iniciar Sesión | FIX Workshop',
    description: 'Accede al panel de administración de FIX Workshop para gestionar tickets, clientes e inventario de tu taller.',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
