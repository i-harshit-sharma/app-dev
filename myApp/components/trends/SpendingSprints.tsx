import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SprintPoint {
    day: string;
    value: number;
    label: string;
}

interface SpendingSprintsProps {
    weekData: SprintPoint[];
    totalSpend?: number;
    peakLabel?: string;
}

const SpendingSprints = ({ weekData, totalSpend, peakLabel }: SpendingSprintsProps) => {
    if (!weekData.length) {
        return null;
    }

    const maxValue = Math.max(...weekData.map(d => d.value));

    const getOpacity = (value: number) => {
        if (maxValue <= 0) {
            return 0.15;
        }
        return (value / maxValue) * 0.9 + 0.1;
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.title}>Spending Sprints</Text>
                    <Text style={styles.subtitle}>Peak spending heatmap (Weekly)</Text>
                </View>
                <View style={styles.summaryPill}>
                    <Text style={styles.summaryLabel}>{peakLabel || '7D Spend'}</Text>
                    <Text style={styles.summaryValue}>₹{Math.round(totalSpend || 0).toLocaleString('en-IN')}</Text>
                </View>
            </View>

            <View style={styles.heatmapContainer}>
                {weekData.map((item, index) => (
                    <View key={index} style={styles.dayColumn}>
                        <View
                            style={[
                                styles.heatBlock,
                                {
                                    backgroundColor: `rgba(41, 121, 255, ${getOpacity(item.value)})`,
                                    height: maxValue > 0 ? 40 + (item.value / maxValue) * 40 : 40,
                                }
                            ]}
                        />
                        <Text style={styles.dayLabel}>{item.day}</Text>
                        <Text style={styles.dayValue}>₹{Math.round(item.value)}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        marginVertical: 10,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A2B3C',
        marginBottom: 4,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    subtitle: {
        fontSize: 12,
        color: '#666',
    },
    summaryPill: {
        backgroundColor: '#EEF5FF',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignItems: 'flex-end',
    },
    summaryLabel: {
        fontSize: 10,
        color: '#667085',
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    summaryValue: {
        fontSize: 14,
        color: '#1A2B3C',
        fontWeight: '800',
    },
    heatmapContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 120,
    },
    dayColumn: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        width: 36,
    },
    heatBlock: {
        width: '100%',
        borderRadius: 6,
        marginBottom: 8,
    },
    dayLabel: {
        color: '#666',
        fontSize: 12,
        fontWeight: '600',
    },
    dayValue: {
        color: '#98A2B3',
        fontSize: 10,
        fontWeight: '600',
        marginTop: 4,
    },
});

export default SpendingSprints;