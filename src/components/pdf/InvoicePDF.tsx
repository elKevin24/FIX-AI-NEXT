import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

interface InvoicePDFProps {
    invoice: {
        invoiceNumber: string;
        customerName: string;
        customerNIT: string | null;
        customerAddress: string | null;
        issuedAt: Date;
        laborCost: number;
        partsCost: number;
        subtotal: number;
        taxAmount: number;
        discountAmount: number;
        total: number;
        notes: string | null;
        tenant: {
            name: string;
        };
        ticket: {
            ticketNumber: string;
            title: string;
            partsUsed: Array<{
                quantity: number;
                partName: string;
                unitPrice: number;
                total: number;
            }>;
        };
    };
}

const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
    header: { marginBottom: 20, borderBottom: '1 solid #eee', paddingBottom: 10 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#1e40af' },
    infoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    section: { marginBottom: 15 },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 5, borderBottom: '1 solid #eee' },
    table: { display: 'flex', width: 'auto', marginBottom: 10 },
    tableRow: { flexDirection: 'row', borderBottom: '1 solid #f3f4f6', padding: '5 0' },
    tableHeader: { backgroundColor: '#f9fafb', fontWeight: 'bold' },
    colDescription: { width: '60%' },
    colQty: { width: '10%', textAlign: 'center' },
    colPrice: { width: '15%', textAlign: 'right' },
    colTotal: { width: '15%', textAlign: 'right' },
    totalsSection: { marginTop: 20, borderTop: '1 solid #eee', paddingTop: 10, alignItems: 'flex-end' },
    totalRow: { flexDirection: 'row', marginBottom: 3 },
    totalLabel: { width: 100, textAlign: 'right', fontWeight: 'bold', paddingRight: 10 },
    totalValue: { width: 80, textAlign: 'right' },
    grandTotal: { fontSize: 14, color: '#1e40af', fontWeight: 'bold', marginTop: 5 },
    footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', color: '#9ca3af', fontSize: 8 }
});

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice }) => {
    const formatCurrency = (val: number) => `Q${Number(val).toFixed(2)}`;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.title}>{invoice.tenant.name}</Text>
                    <Text>FACTURA #{invoice.invoiceNumber}</Text>
                </View>

                <View style={styles.infoGrid}>
                    <View>
                        <Text style={{ fontWeight: 'bold' }}>FACTURAR A:</Text>
                        <Text>{invoice.customerName}</Text>
                        <Text>NIT: {invoice.customerNIT || 'C/F'}</Text>
                        <Text>{invoice.customerAddress || ''}</Text>
                    </View>
                    <View style={{ textAlign: 'right' }}>
                        <Text>Fecha: {new Date(invoice.issuedAt).toLocaleDateString()}</Text>
                        <Text>Ticket Ref: #{invoice.ticket.ticketNumber}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>DETALLE DE SERVICIOS</Text>
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <Text style={styles.colDescription}>Descripción</Text>
                            <Text style={styles.colQty}>Cant.</Text>
                            <Text style={styles.colPrice}>Precio</Text>
                            <Text style={styles.colTotal}>Total</Text>
                        </View>
                        
                        {/* Mano de Obra */}
                        <View style={styles.tableRow}>
                            <Text style={styles.colDescription}>Mano de Obra - {invoice.ticket.title}</Text>
                            <Text style={styles.colQty}>1</Text>
                            <Text style={styles.colPrice}>{formatCurrency(invoice.laborCost)}</Text>
                            <Text style={styles.colTotal}>{formatCurrency(invoice.laborCost)}</Text>
                        </View>

                        {/* Repuestos */}
                        {invoice.ticket.partsUsed.map((p, i) => (
                            <View key={i} style={styles.tableRow}>
                                <Text style={styles.colDescription}>{p.partName}</Text>
                                <Text style={styles.colQty}>{p.quantity}</Text>
                                <Text style={styles.colPrice}>{formatCurrency(p.unitPrice)}</Text>
                                <Text style={styles.colTotal}>{formatCurrency(p.total)}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.totalsSection}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Subtotal:</Text>
                        <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
                    </View>
                    {Number(invoice.discountAmount) > 0 && (
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Descuento:</Text>
                            <Text style={styles.totalValue}>-{formatCurrency(invoice.discountAmount)}</Text>
                        </View>
                    )}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>IVA:</Text>
                        <Text style={styles.totalValue}>{formatCurrency(invoice.taxAmount)}</Text>
                    </View>
                    <View style={[styles.totalRow, styles.grandTotal]}>
                        <Text style={styles.totalLabel}>TOTAL:</Text>
                        <Text style={styles.totalValue}>{formatCurrency(invoice.total)}</Text>
                    </View>
                </View>

                {invoice.notes && (
                    <View style={{ marginTop: 30 }}>
                        <Text style={{ fontWeight: 'bold' }}>Notas:</Text>
                        <Text>{invoice.notes}</Text>
                    </View>
                )}

                <Text style={styles.footer}>
                    Esta factura es un documento tributario emitido por {invoice.tenant.name}.
                    Generado por FIX-AI Workshop Management.
                </Text>
            </Page>
        </Document>
    );
};
