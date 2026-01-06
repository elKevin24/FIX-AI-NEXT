/**
 * Wrapper de Gestión para Ticket80mm
 * Funcionalidades:
 * - Descarga como Imagen (PNG)
 * - Descarga como PDF
 * - Web Share API para compartir (WhatsApp/Telegram en móviles)
 * - Impresión optimizada
 * @author Senior Fullstack Developer
 */

'use client';

import React, { useRef, useState } from 'react';
import Ticket80mm from './Ticket80mm';
import { Ticket80mmData } from '@/types/ticket80mm';
import styles from './TicketActions.module.css';

interface TicketActionsProps {
    ticket: Ticket80mmData;
    showParts?: boolean;
    showServices?: boolean;
    showCostSummary?: boolean;
    onDownloadStart?: () => void;
    onDownloadComplete?: () => void;
    onError?: (error: Error) => void;
}

/**
 * Detecta si el dispositivo es móvil
 */
const isMobileDevice = (): boolean => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    );
};

/**
 * Verifica si el navegador soporta Web Share API
 */
const supportsWebShare = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    return !!navigator.share;
};

/**
 * Wrapper principal con acciones de descarga, compartir e imprimir
 */
const TicketActions: React.FC<TicketActionsProps> = ({
    ticket,
    showParts = true,
    showServices = true,
    showCostSummary = true,
    onDownloadStart,
    onDownloadComplete,
    onError,
}) => {
    const ticketRef = useRef<HTMLDivElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    /**
     * Genera el ticket como imagen usando html2canvas
     */
    const generateImage = async (): Promise<Blob> => {
        if (!ticketRef.current) {
            throw new Error('Referencia al ticket no disponible');
        }

        // Importación dinámica de html2canvas
        const html2canvas = (await import('html2canvas')).default;

        const canvas = await html2canvas(ticketRef.current, {
            scale: 3, // Alta resolución
            backgroundColor: '#ffffff',
            logging: false,
            width: 302,
            windowWidth: 302,
        });

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Error al generar imagen'));
                }
            }, 'image/png');
        });
    };

    /**
     * Descarga el ticket como imagen PNG
     */
    const handleDownloadImage = async () => {
        try {
            setIsProcessing(true);
            onDownloadStart?.();

            const blob = await generateImage();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const ticketId = ticket.id.slice(0, 8).toUpperCase();
            link.download = `ticket-${ticketId}.png`;
            link.href = url;
            link.click();

            URL.revokeObjectURL(url);
            onDownloadComplete?.();
        } catch (error) {
            onError?.(error instanceof Error ? error : new Error('Error desconocido'));
            console.error('Error al descargar imagen:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Descarga el ticket como PDF usando jsPDF
     */
    const handleDownloadPDF = async () => {
        try {
            setIsProcessing(true);
            onDownloadStart?.();

            const blob = await generateImage();

            // Importación dinámica de jsPDF
            const { default: jsPDF } = await import('jspdf');

            // Crear PDF en formato de ticket (80mm x altura automática)
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [80, 297], // 80mm de ancho, altura A4
            });

            // Convertir blob a base64
            const reader = new FileReader();
            reader.readAsDataURL(blob);

            await new Promise<void>((resolve, reject) => {
                reader.onload = () => {
                    try {
                        const imageData = reader.result as string;
                        const imgWidth = 76; // Margen de 2mm por lado
                        const imgHeight = (imgWidth * ticketRef.current!.clientHeight) / ticketRef.current!.clientWidth;

                        pdf.addImage(imageData, 'PNG', 2, 2, imgWidth, imgHeight);

                        const ticketId = ticket.id.slice(0, 8).toUpperCase();
                        pdf.save(`ticket-${ticketId}.pdf`);

                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.onerror = reject;
            });

            onDownloadComplete?.();
        } catch (error) {
            onError?.(error instanceof Error ? error : new Error('Error desconocido'));
            console.error('Error al descargar PDF:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Comparte el ticket usando Web Share API
     */
    const handleShare = async () => {
        try {
            setIsProcessing(true);
            onDownloadStart?.();

            const blob = await generateImage();
            const ticketId = ticket.id.slice(0, 8).toUpperCase();
            const file = new File([blob], `ticket-${ticketId}.png`, { type: 'image/png' });

            const shareData = {
                title: `Ticket #${ticketId}`,
                text: `Orden de Servicio #${ticketId}\nCliente: ${ticket.customer.name}\nEstado: ${ticket.status}`,
                files: [file],
            };

            // Verificar si el navegador soporta compartir archivos
            if (navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else {
                // Fallback: compartir solo texto (útil en navegadores que no soportan files)
                await navigator.share({
                    title: shareData.title,
                    text: shareData.text,
                });
            }

            onDownloadComplete?.();
        } catch (error) {
            // El usuario canceló el share dialog, no es un error
            if ((error as Error).name === 'AbortError') {
                console.log('Usuario canceló compartir');
            } else {
                onError?.(error instanceof Error ? error : new Error('Error desconocido'));
                console.error('Error al compartir:', error);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Imprime el ticket usando window.print()
     */
    const handlePrint = () => {
        window.print();
    };

    const isMobile = isMobileDevice();
    const canShare = supportsWebShare();

    return (
        <div className={styles.container}>
            {/* Ticket Component */}
            <div className={styles.ticketWrapper}>
                <Ticket80mm
                    ref={ticketRef}
                    ticket={ticket}
                    showParts={showParts}
                    showServices={showServices}
                    showCostSummary={showCostSummary}
                />
            </div>

            {/* Action Buttons */}
            <div className={styles.actionsBar}>
                <button
                    className={styles.actionButton}
                    onClick={handleDownloadImage}
                    disabled={isProcessing}
                    title="Descargar como Imagen"
                >
                    <span className={styles.buttonIcon}>📷</span>
                    <span className={styles.buttonText}>Imagen</span>
                </button>

                <button
                    className={styles.actionButton}
                    onClick={handleDownloadPDF}
                    disabled={isProcessing}
                    title="Descargar como PDF"
                >
                    <span className={styles.buttonIcon}>📄</span>
                    <span className={styles.buttonText}>PDF</span>
                </button>

                {isMobile && canShare && (
                    <button
                        className={`${styles.actionButton} ${styles.shareButton}`}
                        onClick={handleShare}
                        disabled={isProcessing}
                        title="Compartir por WhatsApp/Telegram"
                    >
                        <span className={styles.buttonIcon}>📱</span>
                        <span className={styles.buttonText}>Compartir</span>
                    </button>
                )}

                <button
                    className={styles.actionButton}
                    onClick={handlePrint}
                    disabled={isProcessing}
                    title="Imprimir"
                >
                    <span className={styles.buttonIcon}>🖨️</span>
                    <span className={styles.buttonText}>Imprimir</span>
                </button>
            </div>

            {/* Processing Indicator */}
            {isProcessing && (
                <div className={styles.processingOverlay}>
                    <div className={styles.spinner}></div>
                    <p className={styles.processingText}>Procesando...</p>
                </div>
            )}
        </div>
    );
};

export default TicketActions;
