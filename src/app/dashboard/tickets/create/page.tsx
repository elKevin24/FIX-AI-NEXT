import TicketWizard from './TicketWizard';
import styles from '../tickets.module.css';

export default function CreateTicketPage() {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className="text-2xl font-bold mb-6">Nuevo Ingreso de Servicio</h1>
            </div>

            <div className={styles.tableContainer} style={{ padding: '0', background: 'transparent', boxShadow: 'none' }}>
                <TicketWizard />
            </div>
        </div>
    );
}
