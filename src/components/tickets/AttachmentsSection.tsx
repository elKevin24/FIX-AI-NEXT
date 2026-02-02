
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './AttachmentsSection.module.css';

interface Attachment {
    id: string;
    filename: string;
    url: string;
    mimeType: string;
    size: number;
    createdAt: Date;
    uploadedBy: {
        name: string | null;
        email?: string | null;
    };
}

interface Props {
    ticketId: string;
    initialAttachments: Attachment[];
}

export default function AttachmentsSection({ ticketId, initialAttachments }: Props) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`/api/tickets/${ticketId}/attachments`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Upload failed');
            }

            router.refresh();
        } catch (error) {
            console.error(error);
            alert('Error uploading file');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (attachmentId: string) => {
        if (!confirm('Are you sure you want to delete this attachment?')) return;

        try {
            const res = await fetch(`/api/tickets/${ticketId}/attachments`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attachmentId }),
            });

            if (!res.ok) throw new Error('Delete failed');
            
            router.refresh();
        } catch (error) {
            console.error(error);
            alert('Error deleting file');
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Attachments ({initialAttachments.length})</h3>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {isUploading ? 'Uploading...' : 'Add File'}
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileSelect}
                    accept="image/*,application/pdf"
                />
            </div>

            <div className={styles.grid}>
                {initialAttachments.map((att) => (
                    <div key={att.id} className={styles.card}>
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                            <div className={styles.preview}>
                                {att.mimeType.startsWith('image/') ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={att.url} alt={att.filename} className={styles.imagePreview} />
                                ) : (
                                    <span style={{fontSize: '2rem'}}>📄</span>
                                )}
                            </div>
                        </a>
                        <div className={styles.info}>
                            <div className={styles.filename} title={att.filename}>{att.filename}</div>
                            <div className={styles.meta}>
                                <span>{formatSize(att.size)}</span>
                                <span title={att.uploadedBy.name || 'Unknown'}>{att.uploadedBy.name?.split(' ')[0] || 'User'}</span>
                            </div>
                        </div>
                        <button 
                            className={styles.deleteBtn}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(att.id);
                            }}
                            title="Delete"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            {initialAttachments.length === 0 && (
                 <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                    No attachments yet. <br/>Upload images or documents related to this ticket.
                 </div>
            )}
        </div>
    );
}
