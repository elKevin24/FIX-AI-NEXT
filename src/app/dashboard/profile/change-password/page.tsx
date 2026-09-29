import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ChangePasswordForm from './ChangePasswordForm';
import PageHeader from '@/components/PageHeader';
import { Card, CardBody, Alert } from '@/components/ui';

export const metadata = {
  title: 'Cambiar Contraseña',
  description: 'Actualiza la contraseña de tu cuenta de forma segura.',
  robots: { index: false, follow: false },
};

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
                <div className="mb-4">
                    <Alert variant="warning">
                        Tu contraseña es temporal. Debes cambiarla para continuar usando el sistema.
                    </Alert>
                </div>
            )}

            <Card>
                <CardBody>
                    <ChangePasswordForm isForced={isForced} />
                </CardBody>
            </Card>
        </div>
    );
}
