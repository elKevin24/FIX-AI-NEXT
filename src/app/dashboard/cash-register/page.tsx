import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getOpenCashRegister } from '@/lib/cash-register-actions';
import CashRegisterClient from './CashRegisterClient';
import { serializeDecimal } from '@/lib/utils';

export const metadata = {
  title: 'Caja Registradora | FIX-AI',
  description: 'Control de flujo de efectivo y cierres de caja diario.',
};

export default async function CashRegisterPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect('/login');
  }

  const openRegister = await getOpenCashRegister();
  const serializedRegister = serializeDecimal(openRegister);

  return <CashRegisterClient initialOpenRegister={serializedRegister} />;
}
