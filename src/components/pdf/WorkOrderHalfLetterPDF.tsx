import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export interface HalfLetterWorkOrderData {
    ticket: {
        id: string;
        ticketNumber?: string | null;
        title: string;
        description: string;
        status: string;
        priority: string | null;
        deviceType?: string | null;
        deviceModel?: string | null;
        serialNumber?: string | null;
        accessories?: string | null;
        checkInNotes?: string | null;
        createdAt: Date | string;
        dueDate?: Date | string | null;
        estimatedCompletionDate?: Date | string | null;
        customer: {
            name: string;
            email?: string | null;
            phone?: string | null;
            address?: string | null;
            dpi?: string | null;
            nit?: string | null;
        };
        tenant: {
            name: string;
            settings?: {
                businessName?: string | null;
                businessNIT?: string | null;
                businessAddress?: string | null;
                businessPhone?: string | null;
                businessEmail?: string | null;
                taxName?: string | null;
                currency?: string | null;
            } | null;
        };
        assignedTo?: {
            name: string | null;
            email: string;
        } | null;
        partsUsed?: Array<{
            id: string;
            quantity: number;
            part: {
                name: string;
                sku?: string | null;
                price?: any;
            };
        }>;
        services?: Array<{
            id: string;
            name: string;
            laborCost?: any;
        }>;
    };
}

// Media Carta / Statement: 5.5 x 8.5 inches = 396 x 612 pt
const styles = StyleSheet.create({
    page: {
        padding: 20,
        fontSize: 8,
        fontFamily: 'Helvetica',
        backgroundColor: '#ffffff',
        color: '#1f2937',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: '1.5 solid #2563eb',
        paddingBottom: 8,
        marginBottom: 8,
    },
    headerLeft: {
        width: '58%',
    },
    headerRight: {
        width: '40%',
        alignItems: 'flex-end',
    },
    companyName: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#1e40af',
        marginBottom: 2,
    },
    companyInfo: {
        fontSize: 7.5,
        color: '#4b5563',
        lineHeight: 1.3,
    },
    docBadge: {
        backgroundColor: '#eff6ff',
        border: '1 solid #bfdbfe',
        borderRadius: 4,
        padding: '3 6',
        alignItems: 'flex-end',
    },
    docTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#1e40af',
    },
    folioNumber: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#111827',
        marginTop: 1,
    },
    docMeta: {
        fontSize: 7,
        color: '#6b7280',
        marginTop: 2,
    },
    gridTwoCols: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
        gap: 8,
    },
    colBox: {
        width: '49%',
        border: '1 solid #e5e7eb',
        borderRadius: 4,
        padding: 6,
        backgroundColor: '#f9fafb',
    },
    boxTitle: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#1e3a8a',
        borderBottom: '1 solid #e5e7eb',
        paddingBottom: 2,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    fieldRow: {
        flexDirection: 'row',
        marginBottom: 2.5,
    },
    fieldLabel: {
        width: '38%',
        fontSize: 7.5,
        fontWeight: 'bold',
        color: '#4b5563',
    },
    fieldValue: {
        width: '62%',
        fontSize: 7.5,
        color: '#111827',
    },
    sectionBox: {
        border: '1 solid #e5e7eb',
        borderRadius: 4,
        padding: 6,
        marginBottom: 6,
        backgroundColor: '#ffffff',
    },
    sectionTitle: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#1e3a8a',
        borderBottom: '1 solid #e5e7eb',
        paddingBottom: 2,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    descriptionText: {
        fontSize: 7.5,
        lineHeight: 1.3,
        color: '#1f2937',
    },
    itemsTable: {
        width: '100%',
        marginTop: 2,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderBottom: '1 solid #d1d5db',
        padding: '2 4',
        fontSize: 7,
        fontWeight: 'bold',
        color: '#374151',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottom: '1 solid #f3f4f6',
        padding: '2 4',
        fontSize: 7,
        color: '#374151',
    },
    colDesc: {
        width: '60%',
    },
    colQty: {
        width: '15%',
        textAlign: 'center',
    },
    colPrice: {
        width: '25%',
        textAlign: 'right',
    },
    termsBox: {
        border: '1 solid #e2e8f0',
        backgroundColor: '#f8fafc',
        borderRadius: 3,
        padding: 5,
        marginBottom: 6,
    },
    termsTitle: {
        fontSize: 6.5,
        fontWeight: 'bold',
        color: '#475569',
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    termsItem: {
        fontSize: 6,
        color: '#64748b',
        lineHeight: 1.25,
        marginBottom: 1,
    },
    signatureContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
        paddingTop: 4,
    },
    signatureBlock: {
        width: '46%',
        alignItems: 'center',
    },
    signatureLine: {
        width: '100%',
        borderTop: '1 solid #4b5563',
        marginBottom: 3,
    },
    signatureName: {
        fontSize: 7,
        fontWeight: 'bold',
        color: '#1f2937',
        textAlign: 'center',
    },
    signatureRole: {
        fontSize: 6,
        color: '#6b7280',
        textAlign: 'center',
    },
    footerContainer: {
        marginTop: 6,
        borderTop: '0.5 solid #e5e7eb',
        paddingTop: 3,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 6,
        color: '#9ca3af',
        textAlign: 'center',
    },
});

const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
        OPEN: 'Abierto',
        WAITING_APPROVAL: 'Esperando Aprobación',
        IN_PROGRESS: 'En Progreso',
        WAITING_FOR_PARTS: 'Esperando Repuestos',
        RESOLVED: 'Resuelto',
        CLOSED: 'Cerrado',
        CANCELLED: 'Cancelado',
        REJECTED: 'Rechazado',
    };
    return labels[status] || status;
};

const getPriorityLabel = (priority: string | null | undefined) => {
    if (!priority) return 'Normal';
    const labels: Record<string, string> = {
        LOW: 'Baja',
        MEDIUM: 'Media',
        HIGH: 'Alta',
        URGENT: 'Urgente',
    };
    return labels[priority] || priority;
};

export const WorkOrderHalfLetterPDF: React.FC<HalfLetterWorkOrderData> = ({ ticket }) => {
    const createdDate = new Date(ticket.createdAt).toLocaleDateString('es-GT', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const dueDate = ticket.dueDate
        ? new Date(ticket.dueDate).toLocaleDateString('es-GT', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
          })
        : null;

    const folio = ticket.ticketNumber || `#${ticket.id.slice(0, 8).toUpperCase()}`;
    const business = ticket.tenant.settings;
    const workshopName = business?.businessName || ticket.tenant.name;

    const hasItems = (ticket.partsUsed && ticket.partsUsed.length > 0) || (ticket.services && ticket.services.length > 0);

    return (
        <Document>
            <Page size={[396, 612]} style={styles['page']}>
                {/* Header */}
                <View style={styles['headerContainer']}>
                    <View style={styles['headerLeft']}>
                        <Text style={styles['companyName']}>{workshopName}</Text>
                        {business?.businessNIT && (
                            <Text style={styles['companyInfo']}>NIT: {business.businessNIT}</Text>
                        )}
                        {business?.businessAddress && (
                            <Text style={styles['companyInfo']}>{business.businessAddress}</Text>
                        )}
                        {business?.businessPhone && (
                            <Text style={styles['companyInfo']}>Tel: {business.businessPhone}</Text>
                        )}
                        {business?.businessEmail && (
                            <Text style={styles['companyInfo']}>{business.businessEmail}</Text>
                        )}
                    </View>
                    <View style={styles['headerRight']}>
                        <View style={styles['docBadge']}>
                            <Text style={styles['docTitle']}>ORDEN DE SERVICIO</Text>
                            <Text style={styles['folioNumber']}>{folio}</Text>
                            <Text style={styles['docMeta']}>Ingreso: {createdDate}</Text>
                            {dueDate && <Text style={styles['docMeta']}>Entrega est.: {dueDate}</Text>}
                        </View>
                    </View>
                </View>

                {/* 2-Column: Customer Info & Device Info */}
                <View style={styles['gridTwoCols']}>
                    {/* Customer */}
                    <View style={styles['colBox']}>
                        <Text style={styles['boxTitle']}>Datos del Cliente</Text>
                        <View style={styles['fieldRow']}>
                            <Text style={styles['fieldLabel']}>Nombre:</Text>
                            <Text style={styles['fieldValue']}>{ticket.customer.name}</Text>
                        </View>
                        {ticket.customer.phone && (
                            <View style={styles['fieldRow']}>
                                <Text style={styles['fieldLabel']}>Teléfono:</Text>
                                <Text style={styles['fieldValue']}>{ticket.customer.phone}</Text>
                            </View>
                        )}
                        {ticket.customer.nit && (
                            <View style={styles['fieldRow']}>
                                <Text style={styles['fieldLabel']}>NIT:</Text>
                                <Text style={styles['fieldValue']}>{ticket.customer.nit}</Text>
                            </View>
                        )}
                        {ticket.customer.dpi && (
                            <View style={styles['fieldRow']}>
                                <Text style={styles['fieldLabel']}>DPI:</Text>
                                <Text style={styles['fieldValue']}>{ticket.customer.dpi}</Text>
                            </View>
                        )}
                        {ticket.customer.email && (
                            <View style={styles['fieldRow']}>
                                <Text style={styles['fieldLabel']}>Email:</Text>
                                <Text style={styles['fieldValue']}>{ticket.customer.email}</Text>
                            </View>
                        )}
                    </View>

                    {/* Device */}
                    <View style={styles['colBox']}>
                        <Text style={styles['boxTitle']}>Datos del Equipo</Text>
                        <View style={styles['fieldRow']}>
                            <Text style={styles['fieldLabel']}>Equipo:</Text>
                            <Text style={styles['fieldValue']}>
                                {ticket.deviceModel || ticket.title} {ticket.deviceType ? `(${ticket.deviceType})` : ''}
                            </Text>
                        </View>
                        {ticket.serialNumber && (
                            <View style={styles['fieldRow']}>
                                <Text style={styles['fieldLabel']}>Serie/IMEI:</Text>
                                <Text style={styles['fieldValue']}>{ticket.serialNumber}</Text>
                            </View>
                        )}
                        <View style={styles['fieldRow']}>
                            <Text style={styles['fieldLabel']}>Estado / Pri.:</Text>
                            <Text style={styles['fieldValue']}>
                                {getStatusLabel(ticket.status)} / {getPriorityLabel(ticket.priority)}
                            </Text>
                        </View>
                        {ticket.accessories && (
                            <View style={styles['fieldRow']}>
                                <Text style={styles['fieldLabel']}>Accesorios:</Text>
                                <Text style={styles['fieldValue']}>{ticket.accessories}</Text>
                            </View>
                        )}
                        {ticket.assignedTo && (
                            <View style={styles['fieldRow']}>
                                <Text style={styles['fieldLabel']}>Técnico:</Text>
                                <Text style={styles['fieldValue']}>
                                    {ticket.assignedTo.name || ticket.assignedTo.email}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Problem Description & Notes */}
                <View style={styles['sectionBox']}>
                    <Text style={styles['sectionTitle']}>Motivo de Ingreso / Falla Reportada</Text>
                    <Text style={styles['descriptionText']}>{ticket.description || 'Sin descripción detallada.'}</Text>
                    {ticket.checkInNotes && (
                        <View style={{ marginTop: 3 }}>
                            <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#b45309' }}>
                                Estado de recepción: {ticket.checkInNotes}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Services and Parts Table (Compact) */}
                {hasItems && (
                    <View style={styles['sectionBox']}>
                        <Text style={styles['sectionTitle']}>Servicios y Repuestos Acordados</Text>
                        <View style={styles['itemsTable']}>
                            <View style={styles['tableHeader']}>
                                <Text style={styles['colDesc']}>Concepto</Text>
                                <Text style={styles['colQty']}>Cant.</Text>
                                <Text style={styles['colPrice']}>Subtotal</Text>
                            </View>
                            {ticket.services?.map((svc) => (
                                <View key={svc.id} style={styles['tableRow']}>
                                    <Text style={styles['colDesc']}>{svc.name}</Text>
                                    <Text style={styles['colQty']}>1</Text>
                                    <Text style={styles['colPrice']}>
                                        Q{Number(svc.laborCost || 0).toFixed(2)}
                                    </Text>
                                </View>
                            ))}
                            {ticket.partsUsed?.map((pu) => (
                                <View key={pu.id} style={styles['tableRow']}>
                                    <Text style={styles['colDesc']}>{pu.part.name}</Text>
                                    <Text style={styles['colQty']}>{pu.quantity}</Text>
                                    <Text style={styles['colPrice']}>
                                        Q{(Number(pu.part.price || 0) * pu.quantity).toFixed(2)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Terms and Conditions */}
                <View style={styles['termsBox']}>
                    <Text style={styles['termsTitle']}>Condiciones de Servicio</Text>
                    <Text style={styles['termsItem']}>
                        1. Todo diagnóstico y presupuesto inicial está sujeto a revisión técnica detallada.
                    </Text>
                    <Text style={styles['termsItem']}>
                        2. El taller no se responsabiliza por la pérdida de datos o software no respaldado por el cliente.
                    </Text>
                    <Text style={styles['termsItem']}>
                        3. Equipos no retirados tras 30 días de notificación causarán cargo por almacenaje.
                    </Text>
                    <Text style={styles['termsItem']}>
                        4. Es indispensable presentar este comprobante impreso o digital para la entrega del equipo.
                    </Text>
                </View>

                {/* Signatures */}
                <View style={styles['signatureContainer']}>
                    <View style={styles['signatureBlock']}>
                        <View style={styles['signatureLine']} />
                        <Text style={styles['signatureName']}>{ticket.customer.name}</Text>
                        <Text style={styles['signatureRole']}>Firma del Cliente (Aceptación)</Text>
                    </View>
                    <View style={styles['signatureBlock']}>
                        <View style={styles['signatureLine']} />
                        <Text style={styles['signatureName']}>
                            {ticket.assignedTo?.name || ticket.assignedTo?.email || workshopName}
                        </Text>
                        <Text style={styles['signatureRole']}>Firma de Recepción / Taller</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles['footerContainer']}>
                    <Text style={styles['footerText']}>
                        Documento generado por FIX-AI • Formato Media Carta (5.5" x 8.5")
                    </Text>
                </View>
            </Page>
        </Document>
    );
};
