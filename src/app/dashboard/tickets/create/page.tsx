'use client';

import { useActionState } from 'react';
import { createTicket } from '@/lib/actions';
import styles from '../tickets.module.css'; // Reuse styles or create new ones

export default function CreateTicketPage() {
    const [state, formAction, isPending] = useActionState(createTicket, null);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Create New Ticket</h1>
            </div>

            <div className={styles.tableContainer} style={{ padding: '2rem' }}>
                <form action={formAction} className="flex flex-col gap-4 max-w-lg">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="title">Title</label>
                        <input
                            id="title"
                            name="title"
                            type="text"
                            required
                            className="p-2 border rounded text-black"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            required
                            rows={4}
                            className="p-2 border rounded text-black"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="customerName">Customer Name</label>
                        <input
                            id="customerName"
                            name="customerName"
                            type="text"
                            required
                            className="p-2 border rounded text-black"
                        />
                    </div>

                    <div aria-live="polite">
                        {state?.message && (
                            <p className="text-red-500">{state.message}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className={styles.createBtn}
                        disabled={isPending}
                    >
                        {isPending ? 'Creating...' : 'Create Ticket'}
                    </button>
                </form>
            </div>
        </div>
    );
}
