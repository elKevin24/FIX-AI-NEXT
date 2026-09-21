'use client';

export default function OfflinePage() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 px-4">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm text-center">
                <div
                    aria-hidden="true"
                    className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50"
                >
                    <svg
                        className="h-7 w-7 text-blue-600 dark:text-blue-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13a9 9 0 0118 0M5 13a6 6 0 0114 0M8 13a3 3 0 014 0H8z"
                        />
                    </svg>
                </div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                    Sin conexión
                </h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                    No tienes acceso a internet en este momento. Vuelve a conectar para
                    seguir usando FIX Workshop.
                </p>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-6 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                    Reintentar
                </button>
            </div>
        </main>
    );
}
