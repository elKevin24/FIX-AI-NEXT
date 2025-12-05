'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TicketSearchPage() {
    const [ticketId, setTicketId] = useState('');
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (ticketId.trim()) {
            router.push(`/tickets/status/${ticketId}`);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24">
            <div className="w-full max-w-md p-8 border rounded-lg shadow-lg bg-white dark:bg-zinc-900">
                <h1 className="text-2xl font-bold mb-6 text-center">Check Ticket Status</h1>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="ticketId">Ticket ID</label>
                        <input
                            id="ticketId"
                            type="text"
                            value={ticketId}
                            onChange={(e) => setTicketId(e.target.value)}
                            placeholder="Enter your ticket ID"
                            required
                            className="p-2 border rounded text-black"
                        />
                    </div>

                    <button
                        type="submit"
                        className="bg-green-600 text-white p-2 rounded hover:bg-green-700 transition-colors"
                    >
                        Check Status
                    </button>
                </form>
            </div>
        </div>
    );
}
