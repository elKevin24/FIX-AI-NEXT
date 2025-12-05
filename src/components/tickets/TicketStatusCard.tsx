
import Link from 'next/link';
import { Ticket, Tenant, User } from '@prisma/client';
import styles from './tickets.module.css';

// Este componente es un Server Component (por defecto en Next.js App Router).
// No contiene efectos cliente (`useEffect`) ni estado local que requiera
// `useOptimistic`. Por eso NO añadimos `use client` aquí.

interface TicketWithTenant extends Ticket {
    tenant: Tenant;
    assignedTo?: User | null;
}

// Cachea el Intl.DateTimeFormat a nivel de módulo para evitar recrearlo
// en cada render y mejorar rendimiento en renders repetidos.
const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
});

const formatDate = (date: Date | string) => {
    // Acepta Date o string (por seguridad si el dato viene serializado)
    const d = typeof date === 'string' ? new Date(date) : date;
    return dateTimeFormatter.format(d);
};

export default function TicketStatusCard({ ticket }: { ticket: TicketWithTenant }) {
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'OPEN':
                return styles.statusOpen;
            case 'IN_PROGRESS':
                return styles.statusInProgress;
            case 'RESOLVED':
                return styles.statusResolved;
            case 'CLOSED':
                return styles.statusClosed;
            default:
                return '';
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24">
            <div className="w-full max-w-3xl p-8 border rounded-lg shadow-2xl bg-white dark:bg-zinc-900 transition-shadow duration-300 hover:shadow-xl">
                <div className="mb-6 border-b pb-4">
                    <h1 className="text-3xl font-bold mb-2 text-zinc-800 dark:text-zinc-100">{ticket.tenant.name}</h1>
                    <p className="text-gray-500 dark:text-gray-400">Ticket Status Check</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="md:col-span-2">
                        <h2 className="text-sm uppercase text-gray-500 font-bold">Ticket ID</h2>
                        <p className="font-mono text-lg text-zinc-700 dark:text-zinc-300">{ticket.id}</p>
                    </div>

                    <div className="md:col-span-2">
                        <h2 className="text-sm uppercase text-gray-500 font-bold">Title</h2>
                        <p className="text-2xl font-semibold text-zinc-800 dark:text-zinc-100">{ticket.title}</p>
                    </div>

                    <div>
                        <h2 className="text-sm uppercase text-gray-500 font-bold">Status</h2>
                        <div className={`${styles.statusPill} ${getStatusClass(ticket.status)}`}>
                            {ticket.status.replace('_', ' ')}
                        </div>
                    </div>

                    <div>
                        <h2 className="text-sm uppercase text-gray-500 font-bold">Priority</h2>
                        <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">{ticket.priority}</p>
                    </div>

                    <div className="md:col-span-2">
                        <h2 className="text-sm uppercase text-gray-500 font-bold">Description</h2>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ticket.description}</p>
                    </div>

                    {ticket.assignedTo && (
                        <div>
                            <h2 className="text-sm uppercase text-gray-500 font-bold">Assigned To</h2>
                            <p className="text-lg text-zinc-700 dark:text-zinc-300">{ticket.assignedTo.name}</p>
                        </div>
                    )}

                    <div>
                        <h2 className="text-sm uppercase text-gray-500 font-bold">Created At</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(ticket.createdAt)}</p>
                    </div>

                    <div>
                        <h2 className="text-sm uppercase text-gray-500 font-bold">Last Updated</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(ticket.updatedAt)}</p>
                    </div>

                    <div className="pt-6 border-t mt-4 md:col-span-2">
                        <Link href="/tickets/status" className="text-blue-500 hover:underline">
                            &larr; Check another ticket
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
