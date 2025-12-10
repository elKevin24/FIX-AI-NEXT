import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Tipos para los datos del ticket
interface TicketNote {
    id: string;
    content: string;
    createdAt: Date;
    author: {
        name: string | null;
        email: string;
    };
}

interface DeliveryReceiptData {
    ticket: {
        id: string;
        title: string;
        description: string;
        status: string;
        priority: string | null;
        createdAt: Date;
        updatedAt: Date;
        customer: {
            name: string;
            email: string | null;
            phone: string | null;
        };
        tenant: {
            name: string;
        };
        assignedTo: {
            name: string | null;
            email: string;
        } | null;
        notes: TicketNote[];
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
        borderBottom: '2 solid #10b981',
        paddingBottom: 10,
    },
    companyName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#059669',
        marginBottom: 5,
    },
    documentTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#374151',
        marginTop: 10,
    },
    completedBadge: {
        backgroundColor: '#d1fae5',
        color: '#065f46',
        padding: '6 12',
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 10,
        alignSelf: 'flex-start',
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
        width: '35%',
        fontWeight: 'bold',
        color: '#4b5563',
    },
    value: {
        width: '65%',
        color: '#1f2937',
    },
    description: {
        marginTop: 5,
        padding: 10,
        backgroundColor: '#f9fafb',
        borderRadius: 4,
        lineHeight: 1.5,
    },
    noteItem: {
        marginBottom: 12,
        padding: 10,
        backgroundColor: '#f9fafb',
        borderLeft: '3 solid #3b82f6',
        borderRadius: 4,
    },
    noteHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    noteAuthor: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    noteDate: {
        fontSize: 9,
        color: '#6b7280',
    },
    noteContent: {
        fontSize: 10,
        lineHeight: 1.4,
        color: '#374151',
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
        marginTop: 30,
        borderTop: '1 solid #d1d5db',
        paddingTop: 20,
    },
    signatureBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 30,
    },
    signatureItem: {
        width: '45%',
        textAlign: 'center',
    },
    signatureLine: {
        borderTop: '1 solid #374151',
        marginBottom: 5,
    },
    metadataRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        fontSize: 9,
        color: '#6b7280',
    },
    summaryBox: {
        backgroundColor: '#ecfdf5',
        border: '2 solid #10b981',
        borderRadius: 8,
        padding: 15,
        marginBottom: 20,
    },
    summaryTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#065f46',
        marginBottom: 10,
    },
    summaryRow: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    summaryLabel: {
        width: '50%',
        fontSize: 10,
        color: '#047857',
    },
    summaryValue: {
        width: '50%',
        fontSize: 10,
        fontWeight: 'bold',
        color: '#065f46',
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

const calculateRepairDuration = (createdAt: Date, updatedAt: Date) => {
    const diff = new Date(updatedAt).getTime() - new Date(createdAt).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
        return `${days} día${days !== 1 ? 's' : ''}`;
    }
    return `${hours} hora${hours !== 1 ? 's' : ''}`;
};

export const DeliveryReceiptPDF: React.FC<DeliveryReceiptData> = ({ ticket }) => {
    const formattedCreatedDate = new Date(ticket.createdAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const formattedCompletedDate = new Date(ticket.updatedAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const repairDuration = calculateRepairDuration(ticket.createdAt, ticket.updatedAt);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.companyName}>{ticket.tenant.name}</Text>
                    <Text style={styles.documentTitle}>Comprobante de Entrega #{ticket.id.slice(0, 8).toUpperCase()}</Text>
                    <Text style={styles.completedBadge}>✓ Reparación Completada</Text>
                    <View style={styles.metadataRow}>
                        <Text>Fecha de entrega: {formattedCompletedDate}</Text>
                    </View>
                </View>

                {/* Resumen de la Reparación */}
                <View style={styles.summaryBox}>
                    <Text style={styles.summaryTitle}>Resumen de la Reparación</Text>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Tiempo de reparación:</Text>
                        <Text style={styles.summaryValue}>{repairDuration}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Estado final:</Text>
                        <Text style={styles.summaryValue}>{getStatusLabel(ticket.status)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Técnico responsable:</Text>
                        <Text style={styles.summaryValue}>
                            {ticket.assignedTo?.name || ticket.assignedTo?.email || 'No asignado'}
                        </Text>
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
                </View>

                {/* Información del Equipo */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Información del Equipo</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Dispositivo:</Text>
                        <Text style={styles.value}>{ticket.title}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Fecha de ingreso:</Text>
                        <Text style={styles.value}>{formattedCreatedDate}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Prioridad:</Text>
                        <Text style={styles.value}>{getPriorityLabel(ticket.priority)}</Text>
                    </View>
                </View>

                {/* Problema Inicial */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Problema Reportado</Text>
                    <Text style={styles.description}>{ticket.description}</Text>
                </View>

                {/* Trabajo Realizado (Notas) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Trabajo Realizado</Text>
                    {ticket.notes.length > 0 ? (
                        ticket.notes.slice(0, 5).map((note) => {
                            const noteDate = new Date(note.createdAt).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            });

                            return (
                                <View key={note.id} style={styles.noteItem}>
                                    <View style={styles.noteHeader}>
                                        <Text style={styles.noteAuthor}>
                                            {note.author.name || note.author.email}
                                        </Text>
                                        <Text style={styles.noteDate}>{noteDate}</Text>
                                    </View>
                                    <Text style={styles.noteContent}>{note.content}</Text>
                                </View>
                            );
                        })
                    ) : (
                        <Text style={styles.description}>No se registraron notas durante la reparación.</Text>
                    )}
                </View>

                {/* Condiciones de Entrega */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Condiciones de Entrega</Text>
                    <Text style={{ marginBottom: 5, lineHeight: 1.5 }}>
                        • El equipo ha sido probado y verificado su correcto funcionamiento.
                    </Text>
                    <Text style={{ marginBottom: 5, lineHeight: 1.5 }}>
                        • Se otorga garantía de 30 días sobre el trabajo realizado.
                    </Text>
                    <Text style={{ marginBottom: 5, lineHeight: 1.5 }}>
                        • La garantía no cubre daños por mal uso o caídas posteriores.
                    </Text>
                    <Text style={{ marginBottom: 5, lineHeight: 1.5 }}>
                        • Conserve este comprobante para hacer válida la garantía.
                    </Text>
                </View>

                {/* Firmas */}
                <View style={styles.signatureSection}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 10 }}>
                        Firmas de Conformidad
                    </Text>
                    <Text style={{ fontSize: 9, color: '#6b7280', marginBottom: 15 }}>
                        El cliente firma en conformidad de haber recibido el equipo en perfectas condiciones.
                    </Text>
                    <View style={styles.signatureBox}>
                        <View style={styles.signatureItem}>
                            <View style={styles.signatureLine} />
                            <Text style={{ fontSize: 10, color: '#6b7280' }}>Recibí Conforme</Text>
                            <Text style={{ fontSize: 9, color: '#9ca3af', marginTop: 3 }}>
                                {ticket.customer.name}
                            </Text>
                        </View>
                        <View style={styles.signatureItem}>
                            <View style={styles.signatureLine} />
                            <Text style={{ fontSize: 10, color: '#6b7280' }}>Entregó</Text>
                            <Text style={{ fontSize: 9, color: '#9ca3af', marginTop: 3 }}>
                                {ticket.assignedTo?.name || ticket.assignedTo?.email || 'Taller'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={{ fontSize: 9, color: '#6b7280', textAlign: 'center' }}>
                        Gracias por confiar en {ticket.tenant.name}
                    </Text>
                    <Text style={{ fontSize: 8, color: '#9ca3af', textAlign: 'center', marginTop: 5 }}>
                        Generado automáticamente por FIX-AI - Sistema de Gestión de Talleres
                    </Text>
                </View>
            </Page>
        </Document>
    );
};
