import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

const { width } = Dimensions.get('window');

type Point = {
    value: number;
    label: string;
};

interface PredictiveBalanceChartProps {
    actualData: Point[];
    projectedData: Point[];
    summaryLabel?: string;
    summaryValue?: string;
}

const PredictiveBalanceChart = ({ actualData, projectedData, summaryLabel, summaryValue }: PredictiveBalanceChartProps) => {
    const primaryColor = '#2979FF'; // Electric Blue
    const projectedColor = '#4FC3F7'; // Lighter Blue for projection

    const { width } = Dimensions.get('window');

    // Light Theme Colors
    const backgroundColor = '#FFFFFF';
    const textColor = '#1A2B3C';
    const subtitleColor = '#666';
    const borderColor = '#F0F0F0';

    const chartWidth = width - 90;
    const chartHeight = 180;
    const horizontalPadding = 10;

    const { actualPoints, projectedPoints } = useMemo(() => {
        const allValues = [...actualData.map((d) => d.value), ...projectedData.map((d) => d.value)];
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const range = Math.max(max - min, 1);

        const toPoints = (data: Point[]) =>
            data.map((item, index) => {
                const x =
                    horizontalPadding +
                    (index * (chartWidth - horizontalPadding * 2)) / Math.max(data.length - 1, 1);
                const y =
                    chartHeight -
                    ((item.value - min) / range) * (chartHeight - 24) -
                    12;
                return { x, y, item };
            });

        return {
            actualPoints: toPoints(actualData),
            projectedPoints: toPoints(projectedData),
        };
    }, [actualData, projectedData, chartHeight, chartWidth]);

    const actualPolyline = actualPoints.map((p) => `${p.x},${p.y}`).join(' ');
    const projectedPolyline = projectedPoints.map((p) => `${p.x},${p.y}`).join(' ');
    const hasData = actualData.some((point) => point.value > 0) || projectedData.some((point) => point.value > 0);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Predictive Balance</Text>
                    <Text style={styles.subtitle}>Based on your recent cash flow</Text>
                </View>
                <View style={styles.headerRight}>
                    {summaryLabel && summaryValue ? (
                        <View style={styles.summaryPill}>
                            <Text style={styles.summaryLabel}>{summaryLabel}</Text>
                            <Text style={styles.summaryValue}>{summaryValue}</Text>
                        </View>
                    ) : null}
                    <View style={styles.legendContainer}>
                        <View style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: primaryColor }]} />
                            <Text style={styles.legendText}>Actual</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: projectedColor, opacity: 0.5, borderStyle: 'dotted', borderWidth: 1 }]} />
                            <Text style={styles.legendText}>Projected</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.chartWrapper}>
                <Svg width={chartWidth} height={chartHeight}>
                    <Line x1={0} y1={chartHeight - 1} x2={chartWidth} y2={chartHeight - 1} stroke={borderColor} strokeWidth={1} />
                    <Polyline points={actualPolyline} fill="none" stroke={primaryColor} strokeWidth={3} />
                    <Polyline points={projectedPolyline} fill="none" stroke={projectedColor} strokeWidth={3} strokeDasharray="6,6" />

                    {actualPoints.map((p) => (
                        <Circle key={`actual-${p.item.label}`} cx={p.x} cy={p.y} r={3.5} fill={primaryColor} />
                    ))}

                    {projectedPoints.slice(1).map((p) => (
                        <Circle key={`projected-${p.item.label}`} cx={p.x} cy={p.y} r={3.5} fill={projectedColor} />
                    ))}
                </Svg>
                <View style={styles.labelsRow}>
                    {actualData.map((d) => (
                        <Text key={d.label} style={[styles.xLabel, d.label === 'Today' && styles.todayLabel]}>
                            {d.label}
                        </Text>
                    ))}
                </View>
            </View>
            {!hasData ? <Text style={styles.emptyText}>Add transactions to improve the projection accuracy.</Text> : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        marginVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    headerRight: {
        alignItems: 'flex-end',
        gap: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A2B3C',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 12,
        color: '#666',
    },
    legendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
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
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    legendText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    chartWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -6,
    },
    labelsRow: {
        width: width - 90,
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    xLabel: {
        fontSize: 11,
        color: '#7B8896',
    },
    todayLabel: {
        color: '#2979FF',
        fontWeight: '700',
    },
    emptyText: {
        marginTop: 12,
        color: '#667085',
        fontSize: 12,
        fontWeight: '600',
    },
});

export default PredictiveBalanceChart;