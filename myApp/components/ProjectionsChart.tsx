import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

const { width } = Dimensions.get('window');

const ProjectionsChart = () => {
    const { theme: currentTheme } = useTheme();
    const theme = Colors[currentTheme];
    const isDark = currentTheme === 'dark';

    const primaryColor = theme.tint;
    const secondaryColor = isDark ? '#555' : 'lightgray';
    const textColor = theme.text;
    const backgroundColor = theme.background;

    // Data for the chart
    const data = [
        {
            value: 50,
            label: 'W1',
            dataPointColor: secondaryColor,
            dataPointRadius: 0, // Hide data point for cleaner look
            color: secondaryColor,
            startFillColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(128, 128, 128, 0.2)',
            endFillColor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(128, 128, 128, 0.01)',
        },
        {
            value: 80,
            label: 'W2',
            dataPointColor: secondaryColor,
            dataPointRadius: 0,
            color: secondaryColor,
            startFillColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(128, 128, 128, 0.2)',
            endFillColor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(128, 128, 128, 0.01)',
        },
        {
            value: 90,
            label: 'W3',
            dataPointColor: primaryColor,
            dataPointRadius: 6,
            color: primaryColor,
            startFillColor: 'rgba(41, 121, 255, 0.28)',
            endFillColor: 'rgba(41, 121, 255, 0.02)',
            // Connect previous (gray) to this (green) smoothly
        },
        {
            value: 70,
            label: 'W4',
            dataPointColor: primaryColor,
            dataPointRadius: 6,
            color: primaryColor,
            startFillColor: 'rgba(41, 121, 255, 0.28)',
            endFillColor: 'rgba(41, 121, 255, 0.02)',
        },
    ];

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#1E1E1E' : '#fff' }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: textColor }]}>Monthly Projections</Text>
                    <Text style={[styles.subtitle, { color: isDark ? '#aaa' : '#666' }]}>
                        Forecast based on spending
                    </Text>
                </View>
                <View style={styles.legendContainer}>
                    <View style={[styles.legendItem, { marginRight: 12 }]}>
                        <View style={[styles.dot, { backgroundColor: secondaryColor }]} />
                        <Text style={[styles.legendText, { color: isDark ? '#aaa' : '#666' }]}>Past</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.dot, { backgroundColor: primaryColor }]} />
                        <Text style={[styles.legendText, { color: isDark ? '#aaa' : '#666' }]}>Future</Text>
                    </View>
                </View>
            </View>

            <View style={styles.chartWrapper}>
                <LineChart
                    data={data}
                    thickness={3}
                    curved
                    isAnimated
                    animationDuration={1200}
                    areaChart
                    hideDataPoints={false}
                    color={primaryColor}
                    startOpacity={0.4}
                    endOpacity={0.1}
                    initialSpacing={20}
                    endSpacing={20}
                    hideRules
                    hideYAxisText
                    yAxisColor="transparent"
                    xAxisColor="transparent"
                    width={width - 80}
                    height={160}
                    adjustToWidth
                    // Modern Pointer
                    pointerConfig={{
                        pointerStripHeight: 160,
                        pointerStripColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                        pointerStripWidth: 2,
                        pointerColor: primaryColor,
                        radius: 6,
                        pointerLabelWidth: 100,
                        pointerLabelHeight: 90,
                        activatePointersOnLongPress: true,
                        autoAdjustPointerLabelPosition: false,
                        pointerLabelComponent: (items: any) => {
                            const item = items[0];
                            return (
                                <View
                                    style={{
                                        height: 70,
                                        width: 100,
                                        backgroundColor: isDark ? '#333' : 'white',
                                        borderRadius: 8,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.1,
                                        shadowRadius: 4,
                                        elevation: 5,
                                        borderWidth: 1,
                                        borderColor: isDark ? '#444' : '#eee',
                                    }}>
                                    <Text style={{ color: isDark ? '#ddd' : '#666', fontSize: 12, marginBottom: 4 }}>
                                        {item.label}
                                    </Text>
                                    <Text style={{ color: isDark ? 'white' : theme.tint, fontWeight: 'bold', fontSize: 18 }}>
                                        {'₹' + item.value}
                                    </Text>
                                </View>
                            );
                        },
                    }}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 24,
        padding: 24,
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '500',
    },
    legendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 4,
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
    },
    chartWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -10,
    },
});

export default ProjectionsChart;