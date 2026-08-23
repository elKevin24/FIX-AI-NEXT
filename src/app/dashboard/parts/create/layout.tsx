import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nuevo Repuesto',
  description: 'Agrega un repuesto al inventario con SKU, precios y stock inicial.',
};

export default function CreatePartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
