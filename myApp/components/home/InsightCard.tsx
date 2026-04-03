import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface InsightCardProps {
    tip?: string;
}

export default function InsightCard({ tip = "You're on track to save ₹5,000 more than last month!" }: InsightCardProps) {
    const { theme: currentTheme } = useTheme();
    const theme = Colors[currentTheme];

    return (
        <View style={[
            styles.card,
            {
                backgroundColor: theme.card,
                borderColor: theme.electricBlue + '40', // 25% opacity
                shadowColor: theme.electricBlue,
            }
        ]}>
            <View style={[styles.iconContainer, { backgroundColor: theme.electricBlue + '15' }]}>
                <MaterialCommunityIcons name="robot-happy-outline" size={24} color={theme.electricBlue} />
            </View>
            <View style={styles.content}>
                <Text style={[styles.label, { color: theme.electricBlue }]}>AI Insight</Text>
                <Text style={[styles.text, { color: theme.text }]}>{tip}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginHorizontal: 20,
        marginVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    content: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    text: {
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
});