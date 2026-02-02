'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AddAvailabilityDialog } from '@/components/technicians/AddAvailabilityDialog';
import { useRouter } from 'next/navigation';

export default function AvailabilityPageClient({ userId }: { userId: string }) {
    const [showDialog, setShowDialog] = useState(false);
    const router = useRouter();

    return (
        <>
            <Button variant="primary" onClick={() => setShowDialog(true)}>
                + Registrar Ausencia
            </Button>

            <AddAvailabilityDialog 
                userId={userId} 
                isOpen={showDialog} 
                onClose={() => setShowDialog(false)}
                onSuccess={() => {
                    // Force refresh to update the list
                    router.refresh();
                }}
            />
        </>
    );
}
