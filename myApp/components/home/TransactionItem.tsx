import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Placeholder for Merchant Logo Logic
// In a real app, this would fetch from a CDN or map categories to logos
const getMerchantLogo = (title: string) => {
    // Simple deterministic initial or icon logic
    return title.charAt(0).toUpperCase();
};

interface TransactionItemProps {
    item: {
        id: string;
        title: string;
        subtitle: string;
        amount: number;
        date?: Date;
        time?: string;
        type: string;
        icon?: string;
        color?: string;
        [key: string]: any;
    };
    onAskAI: () => void;
}

export default function TransactionItem({ item, onAskAI }: TransactionItemProps) {
    const { theme: currentTheme } = useTheme();
    const theme = Colors[currentTheme];
    const router = useRouter();

    const isExpense = item.type === 'expense';
    const amountColor = isExpense ? theme.expense : theme.income;

    const getTimeString = () => {
        if (item.date instanceof Date) {
            return item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        if (item.time) {
            // If time is an ISO string, try to parse it, otherwise return as is
            const parsedDate = new Date(item.time);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            return item.time;
        }
        return '';
    };

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: theme.card }]}
            onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: item.id } })}
            activeOpacity={0.7}
        >
            {/* Merchant Logo / Icon */}
            <View style={[styles.logoContainer, { backgroundColor: (item.color || theme.tint) + '20' }]}>
                {/* Using text initial as placeholder for logo if no specific image is available */}
                <Text style={[styles.logoText, { color: item.color || theme.tint }]}>{getMerchantLogo(item.title)}</Text>
                {/* Alternatively, use the icon from the item if it exists */}
                {/* <Ionicons name={item.icon as any} size={20} color={item.color} /> */}
            </View>

            {/* Details */}
            <View style={styles.content}>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.subtitle, { color: theme.icon }]} numberOfLines={1}>{item.subtitle} • {getTimeString()}</Text>
            </View>

            {/* Amount and Ask AI */}
            <View style={styles.rightContent}>
                <Text style={[styles.amount, { color: amountColor }]}>
                    {isExpense ? '-' : '+'}{Math.abs(item.amount).toFixed(2)}
                </Text>

                {/* Micro-Button for Ask AI */}
                <TouchableOpacity style={[styles.askAiButton, { backgroundColor: theme.electricBlue + '15' }]} onPress={onAskAI}>
                    <Text style={[styles.askAiText, { color: theme.electricBlue }]}>Ask AI</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    logoContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    logoText: {
        fontSize: 20,
        fontWeight: '700',
    },
    content: {
        flex: 1,
        marginRight: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
    },
    rightContent: {
        alignItems: 'flex-end',
        gap: 4,
    },
    amount: {
        fontSize: 16,
        fontWeight: '600',
    },
    askAiButton: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    askAiText: {
        fontSize: 10,
        fontWeight: '600',
    }
});