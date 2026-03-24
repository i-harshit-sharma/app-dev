import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PendingTransactionCardProps {
    transaction: {
        id: string;
        amount: number;
        title: string;
        category: string;
        type: 'expense' | 'income';
        date: Date;
        originalText?: string;
    };
    onConfirm: () => void;
    onIgnore: () => void;
}

export default function PendingTransactionCard({ transaction, onConfirm, onIgnore }: PendingTransactionCardProps) {
    const { theme: currentTheme } = useTheme();
    const theme = Colors[currentTheme];
    const isDark = currentTheme === 'dark';

    const isExpense = transaction.type === 'expense';
    const accentColor = isExpense ? theme.expense : theme.income;

    return (
        <View style={[
            styles.card,
            {
                backgroundColor: theme.card,
                borderColor: accentColor + '40',
                shadowColor: accentColor,
            }
        ]}>
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: accentColor + '15' }]}>
                    <MaterialCommunityIcons 
                        name={isExpense ? "arrow-up-circle-outline" : "arrow-down-circle-outline"} 
                        size={24} 
                        color={accentColor} 
                    />
                </View>
                <View style={styles.headerText}>
                    <Text style={[styles.label, { color: accentColor }]}>
                        Potential {isExpense ? 'Expense' : 'Income'} Detected
                    </Text>
                    <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                        {transaction.title}
                    </Text>
                </View>
                <Text style={[styles.amount, { color: theme.text }]}>
                    {isExpense ? '-' : '+'}₹{Math.round(transaction.amount).toLocaleString('en-IN')}
                </Text>
            </View>

            {transaction.originalText && (
                <Text style={[styles.originalText, { color: theme.icon }]} numberOfLines={2}>
                    "{transaction.originalText}"
                </Text>
            )}

            <View style={styles.actions}>
                <TouchableOpacity 
                    style={[styles.button, styles.ignoreButton, { borderColor: theme.border }]} 
                    onPress={onIgnore}
                >
                    <Ionicons name="close-outline" size={18} color={theme.icon} />
                    <Text style={[styles.buttonText, { color: theme.icon }]}>Ignore</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.button, styles.confirmButton, { backgroundColor: accentColor }]} 
                    onPress={onConfirm}
                >
                    <Ionicons name="checkmark-outline" size={18} color="white" />
                    <Text style={[styles.buttonText, { color: "white", fontWeight: '700' }]}>Confirm</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 20,
        marginVertical: 10,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        elevation: 4,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
    },
    amount: {
        fontSize: 18,
        fontWeight: '700',
    },
    originalText: {
        fontSize: 13,
        fontStyle: 'italic',
        lineHeight: 18,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    ignoreButton: {
        borderWidth: 1,
    },
    confirmButton: {
        elevation: 2,
    },
    buttonText: {
        fontSize: 14,
    },
});
