import type { Metadata } from 'next';
import { Suspense } from 'react';
import ApprovalHandler from './ApprovalHandler';

export const metadata: Metadata = {
    title: 'Aprobación de presupuesto',
    robots: { index: false, follow: false },
};

export default function ApprovalPage() {
    return (
        <Suspense>
            <ApprovalHandler />
        </Suspense>
    );
}