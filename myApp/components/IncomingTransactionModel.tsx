import { ParsedTransaction } from '@/services/ParserService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

interface IncomingTransactionModalProps {
    visible: boolean;
    parsedData: ParsedTransaction | null;
    onClose: () => void;
    onSave: (data: ParsedTransaction) => void;
}

// Mock Data for demonstration
const MOCK_RECEIPT_DATA = {
    merchant: 'Starbucks Coffee',
    amount: 700,
    date: new Date().toISOString(),
    items: [
        { description: 'Caramel Macchiato', amount: 250 },
        { description: 'Bagel with Cream Cheese', amount: 300 },
        { description: 'Banana Bread', amount: 150 },
    ],
    originalText: "Starbucks Coffee\nDate: 2026-02-11\n\nCaramel Macchiato  5.50\nBagel w/ CC       4.00\nBanana Bread      3.00\n\nTotal             12.50"
};

export function IncomingTransactionModal({ visible, parsedData, onClose, onSave }: IncomingTransactionModalProps) {
    const router = useRouter();
    const [scannedData, setScannedData] = useState<any>(null);

    // Effect to load data (using mock if parsedData is null/empty for demo)
    useEffect(() => {
        if (visible) {
            // In a real scenario, we'd use parsedData. 
            // For this task, we default to MOCK_RECEIPT_DATA if no specific data passed
            // or if we just want to force the mock UI.
            setScannedData(parsedData || MOCK_RECEIPT_DATA);
        }
    }, [visible, parsedData]);

    const handleConfirm = () => {
        if (scannedData) {
            onClose();
            // Navigate to add-transaction with pre-filled data
            router.push({
                pathname: '/add-transaction',
                params: {
                    amount: scannedData.amount.toString(),
                    title: scannedData.merchant,
                    category: 'Food', // inferred
                    date: scannedData.date,
                    // You could pass items as a stringified param if needed
                    notes: scannedData.originalText
                }
            });
        }
    };

    if (!scannedData) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <ThemedView style={styles.container}>
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="receipt-outline" size={32} color="#0a7ea4" />
                        </View>
                        <ThemedText type="title" style={styles.title}>Receipt Detected</ThemedText>
                        <ThemedText style={styles.subtitle}>We found a transaction in your clipboard/image.</ThemedText>
                    </View>

                    <ScrollView style={styles.receiptCard}>
                        {/* Merchant Info */}
                        <View style={styles.receiptHeader}>
                            <ThemedText type="subtitle" style={styles.merchantName}>{scannedData.merchant}</ThemedText>
                            <ThemedText style={styles.date}>{new Date(scannedData.date).toLocaleDateString()}</ThemedText>
                        </View>

                        <View style={styles.divider} />

                        {/* Line Items */}
                        <View style={styles.itemsList}>
                            {scannedData.items?.map((item: any, index: number) => (
                                <View key={index} style={styles.itemRow}>
                                    <ThemedText style={styles.itemName}>{item.description}</ThemedText>
                                    <ThemedText style={styles.itemPrice}>{item.amount.toFixed(2)}</ThemedText>
                                </View>
                            ))}
                        </View>

                        <View style={styles.divider} />

                        {/* Total */}
                        <View style={styles.totalRow}>
                            <ThemedText type="subtitle">Total</ThemedText>
                            <ThemedText type="title" style={styles.totalAmount}>₹{scannedData.amount.toFixed(2)}</ThemedText>
                        </View>
                    </ScrollView>

                    <View style={styles.actions}>
                        <Pressable onPress={onClose} style={[styles.button, styles.cancelButton]}>
                            <ThemedText style={styles.cancelButtonText}>Discard</ThemedText>
                        </Pressable>
                        <Pressable onPress={handleConfirm} style={[styles.button, styles.saveButton]}>
                            <ThemedText style={styles.saveButtonText}>Add Transaction</ThemedText>
                        </Pressable>
                    </View>
                </ThemedView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 20,
    },
    container: {
        borderRadius: 24,
        padding: 24,
        backgroundColor: '#fff',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 8,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#e1f5fe',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#1a1a1a',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    receiptCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#eee',
        borderStyle: 'dashed',
    },
    receiptHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    merchantName: {
        fontSize: 16,
        fontWeight: '600',
    },
    date: {
        fontSize: 12,
        color: '#999',
    },
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 12,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    itemsList: {
        gap: 8,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    itemName: {
        fontSize: 14,
        color: '#444',
    },
    itemPrice: {
        fontSize: 14,
        color: '#444',
        fontWeight: '500',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    totalAmount: {
        color: '#0a7ea4',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: '#0a7ea4',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
});