import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function HomePage() {
    const session = await auth();

    // Si ya está autenticado, redirigir al dashboard
    if (session?.user) {
        redirect('/dashboard');
    }

    // Si no está autenticado, redirigir al login
    redirect('/login');
}
