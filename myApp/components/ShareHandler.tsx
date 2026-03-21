import { useTransactions } from '@/context/TransactionContext';
import { OcrService } from '@/services/OcrService';
import { ParsedTransaction, ParserService } from '@/services/ParserService';
import { useShareIntent } from 'expo-share-intent';
import { useEffect, useState } from 'react';
import { IncomingTransactionModal } from './IncomingTransactionModal';

export function ShareHandler() {
    const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
    const { addTransaction } = useTransactions();

    const [parsedData, setParsedData] = useState<ParsedTransaction | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (hasShareIntent && shareIntent) {
            console.log('Received Share Intent:', shareIntent);

            const process = async () => {
                setIsProcessing(true);
                try {
                    // Type safety check
                    if (!shareIntent.type) {
                        console.log("No share intent type found");
                        return;
                    }

                    if (shareIntent.type === 'text' || (shareIntent.type as string) === 'text/plain') {
                        if (shareIntent.text) {
                            const result = ParserService.parseText(shareIntent.text);
                            setParsedData(result);
                            setModalVisible(true);
                        }
                    } else if (shareIntent.type.startsWith('image')) {
                        // Handle Image Share
                        console.log("Processing Image Share:", shareIntent);

                        // Check if files exist - handle various possible property names for robustness
                        const fileObj = shareIntent.files?.[0];
                        const fileUri = fileObj?.path || (fileObj as any)?.uri || (fileObj as any)?.contentUri;

                        console.log("Extracted File URI:", fileUri);

                        if (fileUri) {
                            // Run OCR
                            const { text, error } = await OcrService.parseImage(fileUri);

                            if (text) {
                                const result = ParserService.parseText(text);
                                setParsedData(result);
                                setModalVisible(true);
                            } else {
                                console.error("OCR Failed:", error);
                                // Fallback: show modal with empty data but maybe the image? 
                                setParsedData({
                                    amount: 0,
                                    merchant: 'Unknown (OCR Failed)',
                                    date: new Date(),
                                    method: 'Other',
                                    originalText: `OCR Error: ${error}`
                                });
                                setModalVisible(true);
                            }
                        }
                    }
                } catch (e) {
                    console.error("Error processing share intent:", e);
                } finally {
                    setIsProcessing(false);
                }
            };

            process();
        }
    }, [hasShareIntent, shareIntent]);

    const handleSave = async (data: ParsedTransaction) => {
        try {
            await addTransaction({
                title: data.merchant || 'Expense',
                subtitle: data.method || 'General',
                amount: data.amount || 0,
                currency: 'INR',
                type: 'expense',
                icon: 'receipt',
                color: '#FF6B6B',
                category: 'Shopping',
                paymentMethod: data.method || 'Online',
                date: data.date || new Date(),
                time: new Date().toLocaleTimeString(),
                note: `Source: ${data.originalText}`
            });
            resetShareIntent();
        } catch (e) {
            console.error("Failed to save transaction", e);
        }
    };

    const handleClose = () => {
        setModalVisible(false);
        resetShareIntent();
    };

    return (
        <IncomingTransactionModal
            visible={modalVisible}
            parsedData={parsedData}
            onClose={handleClose}
            onSave={handleSave}
        />
    );
}