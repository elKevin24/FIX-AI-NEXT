import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Tipos para los datos del ticket
interface WorkOrderData {
    ticket: {
        id: string;
        title: string;
        description: string;
        status: string;
        priority: string | null;
        createdAt: Date;
        customer: {
            name: string;
            email: string | null;
            phone: string | null;
            address: string | null;
        };
        tenant: {
            name: string;
        };
        assignedTo: {
            name: string | null;
            email: string;
        } | null;
    };
}

// Estilos para el PDF
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 11,
        fontFamily: 'Helvetica',
        backgroundColor: '#ffffff',
    },
    header: {
        marginBottom: 30,
        borderBottom: '2 solid #2563eb',
        paddingBottom: 10,
    },
    companyName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e40af',
        marginBottom: 5,
    },
    documentTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#374151',
        marginTop: 10,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 10,
        backgroundColor: '#f3f4f6',
        padding: 8,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    label: {
        width: '30%',
        fontWeight: 'bold',
        color: '#4b5563',
    },
    value: {
        width: '70%',
        color: '#1f2937',
    },
    description: {
        marginTop: 5,
        padding: 10,
        backgroundColor: '#f9fafb',
        borderRadius: 4,
        lineHeight: 1.5,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        borderTop: '1 solid #d1d5db',
        paddingTop: 10,
    },
    signatureSection: {
        marginTop: 40,
        borderTop: '1 solid #d1d5db',
        paddingTop: 20,
    },
    signatureBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 40,
    },
    signatureItem: {
        width: '45%',
        textAlign: 'center',
    },
    signatureLine: {
        borderTop: '1 solid #374151',
        marginBottom: 5,
    },
    badge: {
        padding: '4 8',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 'bold',
    },
    statusOpen: {
        backgroundColor: '#dbeafe',
        color: '#1e40af',
    },
    statusInProgress: {
        backgroundColor: '#fef3c7',
        color: '#92400e',
    },
    statusResolved: {
        backgroundColor: '#d1fae5',
        color: '#065f46',
    },
    priorityHigh: {
        backgroundColor: '#fee2e2',
        color: '#991b1b',
    },
    priorityMedium: {
        backgroundColor: '#fef3c7',
        color: '#92400e',
    },
    priorityLow: {
        backgroundColor: '#f3f4f6',
        color: '#374151',
    },
    metadataRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        fontSize: 9,
        color: '#6b7280',
    },
});

const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
        'OPEN': 'Abierto',
        'IN_PROGRESS': 'En Progreso',
        'WAITING_FOR_PARTS': 'Esperando Repuestos',
        'RESOLVED': 'Resuelto',
        'CLOSED': 'Cerrado',
    };
    return labels[status] || status;
};

const getPriorityLabel = (priority: string | null) => {
    if (!priority) return 'Sin definir';
    const labels: Record<string, string> = {
        'LOW': 'Baja',
        'MEDIUM': 'Media',
        'HIGH': 'Alta',
        'URGENT': 'Urgente',
    };
    return labels[priority] || priority;
};

export const WorkOrderPDF: React.FC<WorkOrderData> = ({ ticket }) => {
    const formattedDate = new Date(ticket.createdAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.companyName}>{ticket.tenant.name}</Text>
                    <Text style={styles.documentTitle}>Orden de Ingreso #{ticket.id.slice(0, 8).toUpperCase()}</Text>
                    <View style={styles.metadataRow}>
                        <Text>Fecha de emisión: {formattedDate}</Text>
                    </View>
                </View>

                {/* Información del Cliente */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Datos del Cliente</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Nombre:</Text>
                        <Text style={styles.value}>{ticket.customer.name}</Text>
                    </View>
                    {ticket.customer.phone && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Teléfono:</Text>
                            <Text style={styles.value}>{ticket.customer.phone}</Text>
                        </View>
                    )}
                    {ticket.customer.email && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Email:</Text>
                            <Text style={styles.value}>{ticket.customer.email}</Text>
                        </View>
                    )}
                    {ticket.customer.address && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Dirección:</Text>
                            <Text style={styles.value}>{ticket.customer.address}</Text>
                        </View>
                    )}
                </View>

                {/* Información del Equipo */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Información del Equipo</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Dispositivo:</Text>
                        <Text style={styles.value}>{ticket.title}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Prioridad:</Text>
                        <Text style={styles.value}>{getPriorityLabel(ticket.priority)}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Estado:</Text>
                        <Text style={styles.value}>{getStatusLabel(ticket.status)}</Text>
                    </View>
                    {ticket.assignedTo && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Técnico asignado:</Text>
                            <Text style={styles.value}>{ticket.assignedTo.name || ticket.assignedTo.email}</Text>
                        </View>
                    )}
                </View>

                {/* Falla Reportada */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Falla Reportada</Text>
                    <Text style={styles.description}>{ticket.description}</Text>
                </View>

                {/* Condiciones del Servicio */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Condiciones del Servicio</Text>
                    <Text style={{ marginBottom: 5, lineHeight: 1.5 }}>
                        • El tiempo de reparación dependerá de la disponibilidad de repuestos.
                    </Text>
                    <Text style={{ marginBottom: 5, lineHeight: 1.5 }}>
                        • El cliente será notificado del presupuesto antes de realizar cualquier reparación.
                    </Text>
                    <Text style={{ marginBottom: 5, lineHeight: 1.5 }}>
                        • El taller no se responsabiliza por datos almacenados en el equipo.
                    </Text>
                    <Text style={{ marginBottom: 5, lineHeight: 1.5 }}>
                        • El cliente tiene 30 días para retirar el equipo una vez reparado.
                    </Text>
                </View>

                {/* Firmas */}
                <View style={styles.signatureSection}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 20 }}>
                        Firmas de Conformidad
                    </Text>
                    <View style={styles.signatureBox}>
                        <View style={styles.signatureItem}>
                            <View style={styles.signatureLine} />
                            <Text style={{ fontSize: 10, color: '#6b7280' }}>Firma del Cliente</Text>
                            <Text style={{ fontSize: 9, color: '#9ca3af', marginTop: 3 }}>
                                {ticket.customer.name}
                            </Text>
                        </View>
                        <View style={styles.signatureItem}>
                            <View style={styles.signatureLine} />
                            <Text style={{ fontSize: 10, color: '#6b7280' }}>Firma del Técnico</Text>
                            <Text style={{ fontSize: 9, color: '#9ca3af', marginTop: 3 }}>
                                {ticket.assignedTo?.name || ticket.assignedTo?.email || 'Sin asignar'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={{ fontSize: 9, color: '#6b7280', textAlign: 'center' }}>
                        Este documento es un comprobante de ingreso del equipo. Conserve este documento para el retiro.
                    </Text>
                    <Text style={{ fontSize: 8, color: '#9ca3af', textAlign: 'center', marginTop: 5 }}>
                        Generado automáticamente por FIX-AI - Sistema de Gestión de Talleres
                    </Text>
                </View>
            </Page>
        </Document>
    );
};
