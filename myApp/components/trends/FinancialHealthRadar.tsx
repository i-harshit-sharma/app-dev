import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

const { width } = Dimensions.get('window');

interface FinancialHealthRadarProps {
    data: {
        label: string;
        value: number; // 0 to 100
        fullMark: number;
    }[];
    score?: number;
    subtitle?: string;
}

export default function FinancialHealthRadar({ data, score, subtitle }: FinancialHealthRadarProps) {
    const size = width - 60;
    const center = size / 2;
    const radius = (size / 2) - 40; // Padding for labels
    const levels = 4;

    // Theme Colors
    const theme = {
        bg: '#FFFFFF',
        text: '#1A2B3C',
        webStroke: 'rgba(41, 121, 255, 0.2)',
        axisStroke: 'rgba(41, 121, 255, 0.2)',
        dataFill: 'rgba(41, 121, 255, 0.2)',
        dataStroke: '#2979FF',
        labelColor: '#555',
    };

    const angleSlice = (Math.PI * 2) / data.length;

    // Helper to get coordinates
    const getCoordinates = (value: number, index: number, max: number) => {
        const angle = index * angleSlice - Math.PI / 2;
        const r = (value / max) * radius;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle),
        };
    };

    // Background Webs
    const renderWebs = () => {
        const webs = [];
        for (let i = 1; i <= levels; i++) {
            const points = data.map((_, index) => {
                const { x, y } = getCoordinates(100 * (i / levels), index, 100);
                return `${x},${y}`;
            }).join(' ');

            webs.push(
                <Polygon
                    key={`web-${i}`}
                    points={points}
                    stroke={theme.webStroke} // Electric Blue low opacity
                    strokeWidth="1"
                    fill="none"
                />
            );
        }
        return webs;
    };

    // Axes
    const renderAxes = () => {
        return data.map((item, index) => {
            const { x, y } = getCoordinates(100, index, 100);
            return (
                <Line
                    key={`axis-${index}`}
                    x1={center}
                    y1={center}
                    x2={x}
                    y2={y}
                    stroke={theme.axisStroke}
                    strokeWidth="1"
                />
            );
        });
    };

    // Data Shape
    const renderDataShape = () => {
        const points = data.map((item, index) => {
            const { x, y } = getCoordinates(item.value, index, 100);
            return `${x},${y}`;
        }).join(' ');

        return (
            <Polygon
                points={points}
                stroke={theme.dataStroke} // Electric Blue
                strokeWidth="2"
                fill={theme.dataFill}
            />
        );
    };

    // Data Points and Labels
    const renderLabels = () => {
        return data.map((item, index) => {
            const { x, y } = getCoordinates(115, index, 100); // Push labels out slightly
            const { x: dotX, y: dotY } = getCoordinates(item.value, index, 100);

            return (
                <React.Fragment key={`label-group-${index}`}>
                    <Circle
                        cx={dotX}
                        cy={dotY}
                        r="4"
                        fill="#2979FF"
                        stroke="#fff"
                        strokeWidth="2"
                    />
                    <SvgText
                        x={x}
                        y={y}
                        fill={theme.labelColor}
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                    >
                        {item.label}
                    </SvgText>
                </React.Fragment>
            );
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.title}>Financial Health Score</Text>
                    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                </View>
                {typeof score === 'number' ? (
                    <View style={styles.scorePill}>
                        <Text style={styles.scoreLabel}>Overall</Text>
                        <Text style={styles.scoreValue}>{score}</Text>
                    </View>
                ) : null}
            </View>
            <View style={styles.chartContainer}>
                <Svg height={size} width={size}>
                    {renderWebs()}
                    {renderAxes()}
                    {renderDataShape()}
                    {renderLabels()}
                </Svg>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF', // Light Theme Card
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, // Softer shadow
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    title: {
        color: '#1A2B3C', // Dark Text
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    headerRow: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '600',
    },
    scorePill: {
        backgroundColor: '#EEF5FF',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 16,
        alignItems: 'center',
    },
    scoreLabel: {
        fontSize: 10,
        color: '#667085',
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    scoreValue: {
        fontSize: 20,
        color: '#2979FF',
        fontWeight: '800',
    },
    chartContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});