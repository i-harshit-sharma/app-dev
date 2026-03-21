import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface AISummaryCardProps {
    title?: string;
    text: string;
    badge?: string;
    metricLabel?: string;
    metricValue?: string;
}

const AISummaryCard = ({ title = 'AI Insight', text, badge = 'Personalized', metricLabel, metricValue }: AISummaryCardProps) => {
    return (
        <View style={styles.cardContainer}>
            <View style={styles.contentContainer}>
                <View style={styles.headerRow}>
                    <View style={styles.iconWrap}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="sparkles" size={20} color="#fff" />
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.title}>{title}</Text>
                            <Text style={styles.badge}>{badge}</Text>
                        </View>
                    </View>
                    {metricLabel && metricValue ? (
                        <View style={styles.metricPill}>
                            <Text style={styles.metricLabel}>{metricLabel}</Text>
                            <Text style={styles.metricValue}>{metricValue}</Text>
                        </View>
                    ) : null}
                </View>
                <Text style={styles.text}>{text}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        borderRadius: 24,
        padding: 4, // Gradient border effect simulation or just padding
        marginVertical: 10,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    contentContainer: {
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        padding: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#2979FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        color: '#2979FF',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    badge: {
        color: '#5B6B7B',
        fontSize: 12,
        fontWeight: '600',
    },
    text: {
        color: '#1A2B3C',
        fontSize: 14,
        lineHeight: 21,
    },
    metricPill: {
        backgroundColor: '#E8F1FF',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignItems: 'flex-end',
    },
    metricLabel: {
        fontSize: 10,
        color: '#5B6B7B',
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    metricValue: {
        fontSize: 14,
        color: '#1A2B3C',
        fontWeight: '800',
    },
});

export default AISummaryCard;