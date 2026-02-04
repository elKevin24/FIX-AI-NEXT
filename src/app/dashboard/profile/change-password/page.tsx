import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ChangePasswordForm from './ChangePasswordForm';

export default async function ChangePasswordPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const isForced = session.user.passwordMustChange === true;

    return (
        <div className="max-w-md mx-auto mt-8">
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">
                        {isForced ? 'Cambio de Contraseña Requerido' : 'Cambiar Contraseña'}
                    </h1>
                    {isForced && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                                Tu contraseña es temporal. Debes cambiarla para continuar usando el sistema.
                            </p>
                        </div>
                    )}
                    {!isForced && (
                        <p className="text-gray-600 mt-2">
                            Actualiza tu contraseña de acceso.
                        </p>
                    )}
                </div>

                <ChangePasswordForm isForced={isForced} />
            </div>
        </div>
    );
}
