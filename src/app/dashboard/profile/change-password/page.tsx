import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ChangePasswordForm from './ChangePasswordForm';
import PageHeader from '@/components/PageHeader';

export default async function ChangePasswordPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const isForced = session.user.passwordMustChange === true;

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            <PageHeader
                title={isForced ? 'Cambio de Contraseña Requerido' : 'Cambiar Contraseña'}
                subtitle={!isForced ? 'Actualiza tu contraseña de acceso.' : undefined}
            />
            {isForced && (
                <div className="mt-3 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                        Tu contraseña es temporal. Debes cambiarla para continuar usando el sistema.
                    </p>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border p-6">
                <ChangePasswordForm isForced={isForced} />
            </div>
        </div>
    );
}
