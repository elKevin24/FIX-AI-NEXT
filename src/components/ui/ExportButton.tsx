
'use client';
import { useState } from 'react';

interface Props {
    type: 'tickets' | 'parts' | 'invoices' | 'pos-sales';
    className?: string;
}

export default function ExportButton({ type, className = '' }: Props) {
    const [loading, setLoading] = useState(false);

    const handleExport = async (format: string) => {
        setLoading(true);
        try {
            const url = `/api/export/${type}?format=${format}`;
            // Trigger download
            window.location.href = url;
        } catch (e) {
            console.error(e);
            alert('Export failed');
        } finally {
            setTimeout(() => setLoading(false), 1000); // Reset loading state after short delay
        }
    };

    return (
        <div className={`relative inline-block text-left group ${className}`}>
            <button 
                disabled={loading}
                className="px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                {loading ? 'Exporting...' : 'Export ▼'}
            </button>
            <div className="hidden group-hover:block absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                <div className="py-1">
                    <button 
                        onClick={() => handleExport('xlsx')} 
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                        Excel (.xlsx)
                    </button>
                    <button 
                        onClick={() => handleExport('csv')} 
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                        CSV (.csv)
                    </button>
                </div>
            </div>
        </div>
    );
}
