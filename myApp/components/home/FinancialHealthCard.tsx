// import { Colors } from '@/constants/theme';
// import { useTheme } from '@/context/ThemeContext';
// import { Ionicons } from '@expo/vector-icons';
// import React from 'react';
// import { StyleSheet, Text, View } from 'react-native';
// import Svg, { Circle } from 'react-native-svg';

// interface FinancialHealthCardProps {
//     income: number;
//     expense: number;
//     incomeTrend: number;
//     expenseTrend: number;
//     expensesByMethod: Record<string, number>;
// }

// export default function FinancialHealthCard({ income, expense, incomeTrend, expenseTrend, expensesByMethod }: FinancialHealthCardProps) {
//     const { theme: currentTheme } = useTheme();
//     const theme = Colors[currentTheme];

//     // Total for the chart is Income. If Income is 0, we can't show a meaningful share of income.
//     // Fallback: If Income is 0 but Expense > 0, use Expense as total (100% spent).
//     // If both 0, empty chart.
//     const chartTotal = income > 0 ? income : (expense > 0 ? expense : 1);

//     const paymentMethods = [
//         { name: 'UPI', color: '#4CAF50', label: 'UPI' },
//         { name: 'Card', color: '#2196F3', label: 'Card' },
//         { name: 'Cash', color: '#FFC107', label: 'Cash' },
//         { name: 'Bank Transfer', color: '#9C27B0', label: 'Bank' },
//         { name: 'Others', color: '#9E9E9E', label: 'Other' }
//     ];

//     // Prepare chart segments
//     // 1. Map to basic data
//     const rawSegments = Object.entries(expensesByMethod).map(([method, amount]) => {
//         const normalizedMethod = paymentMethods.find(pm =>
//             method.toLowerCase().includes(pm.name.toLowerCase()) ||
//             pm.name.toLowerCase().includes(method.toLowerCase())
//         ) || paymentMethods[4];

//         const percentage = Math.max(0, amount / chartTotal);
//         return {
//             name: method,
//             amount,
//             color: normalizedMethod.color,
//             percentage
//         };
//     });

//     // 2. Sort by amount descending
//     rawSegments.sort((a, b) => b.amount - a.amount);

//     // 3. Calculate startPercentage (offsets) strictly based on sorted order
//     let accumulatedPercentage = 0;
//     const expenseSegments = rawSegments.map(segment => {
//         const startPercentage = accumulatedPercentage;
//         accumulatedPercentage += segment.percentage;
//         return {
//             ...segment,
//             startPercentage
//         };
//     });

//     // 4. Create proper segment list for rendering
//     // We only render expenses. The remaining "gap" will show the background track (theme.border).
//     // so we don't need to manually add a "Savings" segment anymore.

//     const expensePercentage = income > 0 ? (expense / income) : (expense > 0 ? 1 : 0);

//     // Progress Ring Constants
//     const radius = 60;
//     const strokeWidth = 12;
//     const circumference = 2 * Math.PI * radius;

//     const renderSegment = (segment: any, index: number) => {
//         // Calculate strokeDasharray
//         // dash = length of segment
//         // gap = circumference - length
//         const segmentLength = circumference * segment.percentage;
//         const gapLength = circumference - segmentLength;

//         // Calculate Rotation
//         // Start at -90deg (12 o'clock)
//         // Add startPercentage * 360
//         const rotationAngle = -90 + (segment.startPercentage * 360);

//         return (
//             <Circle
//                 key={index}
//                 cx="70"
//                 cy="70"
//                 r={radius}
//                 stroke={segment.color}
//                 strokeWidth={strokeWidth}
//                 fill="transparent"
//                 strokeDasharray={[segmentLength, gapLength]}
//                 strokeLinecap="butt"
//                 origin="70, 70"
//                 rotation={rotationAngle}
//             />
//         );
//     };

//     const formatCurrency = (amount: number) => {
//         return `₹${Math.abs(amount).toLocaleString('en-IN')}`;
//     };

//     return (
//         <View style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.text }]}>
//             <View style={styles.header}>
//                 <Text style={[styles.title, { color: theme.text }]}>Financial Health</Text>
//                 <Ionicons name="ellipsis-horizontal" size={20} color={theme.icon} />
//             </View>

//             <View style={styles.content}>
//                 {/* Donut Chart */}
//                 <View style={styles.chartContainer}>
//                     <Svg height="140" width="140" viewBox="0 0 140 140">
//                         {/* We no longer need a global group rotation since each circle rotates itself */}
//                         {/* Background Circle (Optional, but good for anti-aliasing edges or empty state) */}
//                         <Circle
//                             cx="70"
//                             cy="70"
//                             r={radius}
//                             stroke={theme.border} // Visible track for "empty" or "savings" part
//                             strokeWidth={strokeWidth}
//                             fill="transparent"
//                         />

//                         {/* Segments: Expenses only (Savings is the empty track) */}
//                         {expenseSegments.map(renderSegment)}
//                     </Svg>

//                     {/* Center Text: Total Spent */}
//                     <View style={styles.chartTextContainer}>
//                         <Text style={[styles.percentageLabel, { color: theme.icon, fontSize: 10 }]}>Total Spent</Text>
//                         <Text style={[styles.percentageText, { color: theme.text, fontSize: 16 }]}>
//                             {formatCurrency(expense)}
//                         </Text>
//                         <Text style={[styles.percentageLabel, { color: theme.expense, fontSize: 10, marginTop: 2 }]}>
//                             {Math.round(expensePercentage * 100)}%
//                         </Text>
//                     </View>
//                 </View>

//                 {/* Legend & Stats */}
//                 <View style={styles.legendContainer}>
//                     {/* Total Income Label */}
//                     <View style={styles.totalIncomeRow}>
//                         <Text style={[styles.statLabel, { color: theme.icon }]}>Total Income</Text>
//                         <Text style={[styles.statValue, { color: theme.text }]}>{formatCurrency(income)}</Text>
//                     </View>

//                     <View style={styles.divider} />

//                     {/* Expense Breakdown Legend */}
//                     {expenseSegments.slice(0, 4).map((segment, index) => (
//                         <View key={index} style={styles.legendItem}>
//                             <View style={styles.legendLeft}>
//                                 <View style={[styles.dot, { backgroundColor: segment.color }]} />
//                                 <Text style={[styles.legendLabel, { color: theme.icon }]} numberOfLines={1}>
//                                     {segment.name}
//                                 </Text>
//                             </View>
//                             <Text style={[styles.legendValue, { color: theme.text }]}>
//                                 {formatCurrency(segment.amount)}
//                             </Text>
//                         </View>
//                     ))}
//                     {expenseSegments.length === 0 && (
//                         <Text style={{ color: theme.icon, fontStyle: 'italic', fontSize: 12 }}>No expenses yet</Text>
//                     )}
//                 </View>
//             </View>
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     card: {
//         borderRadius: 24,
//         padding: 20,
//         marginHorizontal: 20,
//         marginTop: 10,
//         shadowOffset: { width: 0, height: 4 },
//         shadowOpacity: 0.1,
//         shadowRadius: 10,
//         elevation: 5,
//     },
//     header: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         marginBottom: 20,
//     },
//     title: {
//         fontSize: 18,
//         fontWeight: '700',
//         fontFamily: 'sans-serif', // Replace with Inter if available
//     },
//     content: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'space-between',
//     },
//     chartContainer: {
//         width: 140,
//         height: 140, // Full height for full circle
//         alignItems: 'center',
//         justifyContent: 'center',
//     },
//     chartTextContainer: {
//         position: 'absolute',
//         // Center the text in the 140x140 container
//         top: 0,
//         bottom: 0,
//         left: 0,
//         right: 0,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     percentageText: {
//         fontSize: 18, // Slightly smaller for full readout
//         fontWeight: '800',
//     },
//     percentageLabel: {
//         fontSize: 12,
//         fontWeight: '500',
//     },
//     leaderboardContainer: { // Keeping legacy name if beneficial, or just remove
//         flex: 1,
//     },
//     legendContainer: {
//         flex: 1,
//         paddingLeft: 20,
//         gap: 10,
//         justifyContent: 'center',
//     },
//     totalIncomeRow: {
//         marginBottom: 4,
//     },
//     divider: {
//         height: 1,
//         backgroundColor: '#E5E7EB',
//         marginVertical: 4,
//         opacity: 0.5,
//     },
//     legendItem: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'space-between',
//         width: '100%',
//     },
//     legendLeft: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         gap: 8,
//         flex: 1,
//     },
//     dot: {
//         width: 8,
//         height: 8,
//         borderRadius: 4,
//     },
//     legendLabel: {
//         fontSize: 12,
//         fontWeight: '500',
//     },
//     legendValue: {
//         fontSize: 12,
//         fontWeight: '700',
//     },
//     statLabel: {
//         fontSize: 10,
//         fontWeight: '500',
//         textTransform: 'uppercase',
//         letterSpacing: 0.5,
//     },
//     statValue: {
//         fontSize: 18,
//         fontWeight: '700',
//     },
// });


import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface FinancialHealthCardProps {
    income: number;
    expense: number;
    incomeTrend: number;
    expenseTrend: number;
    expensesByMethod: Record<string, number>;
}

export default function FinancialHealthCard({ income, expense, incomeTrend, expenseTrend, expensesByMethod }: FinancialHealthCardProps) {
    const { theme: currentTheme } = useTheme();
    const theme = Colors[currentTheme];

    // Total for the chart is Income. If Income is 0, we can't show a meaningful share of income.
    // Fallback: If Income is 0 but Expense > 0, use Expense as total (100% spent).
    // If both 0, empty chart.
    const chartTotal = income > 0 ? income : (expense > 0 ? expense : 1);

    const paymentMethods = [
        { name: 'UPI', color: '#4CAF50', label: 'UPI' },
        { name: 'Card', color: '#2196F3', label: 'Card' },
        { name: 'Cash', color: '#FFC107', label: 'Cash' },
        { name: 'Bank Transfer', color: '#9C27B0', label: 'Bank' },
        { name: 'Others', color: '#9E9E9E', label: 'Other' }
    ];

    // Prepare chart segments
    // 1. Map to basic data
    const rawSegments = Object.entries(expensesByMethod).map(([method, amount]) => {
        const normalizedMethod = paymentMethods.find(pm =>
            method.toLowerCase().includes(pm.name.toLowerCase()) ||
            pm.name.toLowerCase().includes(method.toLowerCase())
        ) || paymentMethods[4];

        const percentage = Math.max(0, amount / chartTotal);
        return {
            name: method,
            amount,
            color: normalizedMethod.color,
            percentage
        };
    });

    // 2. Sort by amount descending
    rawSegments.sort((a, b) => b.amount - a.amount);

    // 3. Calculate startPercentage (offsets) strictly based on sorted order
    let accumulatedPercentage = 0;
    const expenseSegments = rawSegments.map(segment => {
        const startPercentage = accumulatedPercentage;
        accumulatedPercentage += segment.percentage;
        return {
            ...segment,
            startPercentage
        };
    });

    const expensePercentage = income > 0 ? (expense / income) : (expense > 0 ? 1 : 0);

    // Progress Ring Constants
    const radius = 60;
    const strokeWidth = 12;
    const circumference = 2 * Math.PI * radius;

    const renderSegment = (segment: any, index: number) => {
        // Calculate the arc length for this segment
        const segmentLength = circumference * segment.percentage;
        const gapLength = circumference - segmentLength;

        // Calculate rotation angle to position this segment
        // Start at -90deg (12 o'clock) and add the accumulated percentage
        const rotationAngle = -90 + (segment.startPercentage * 360);

        return (
            <Circle
                key={index}
                cx="70"
                cy="70"
                r={radius}
                stroke={segment.color}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={`${segmentLength} ${gapLength}`}
                strokeLinecap="round"
                transform={`rotate(${rotationAngle} 70 70)`}
            />
        );
    };

    const formatCurrency = (amount: number) => {
        return `₹${Math.abs(amount).toLocaleString('en-IN')}`;
    };

    return (
        <View style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.text }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Financial Health</Text>
                <Ionicons name="ellipsis-horizontal" size={20} color={theme.icon} />
            </View>

            <View style={styles.content}>
                {/* Donut Chart */}
                <View style={styles.chartContainer}>
                    <Svg height="140" width="140" viewBox="0 0 140 140">
                        {/* Background Circle */}
                        <Circle
                            cx="70"
                            cy="70"
                            r={radius}
                            stroke={theme.border}
                            strokeWidth={strokeWidth}
                            fill="transparent"
                        />

                        {/* Expense Segments */}
                        {expenseSegments.map(renderSegment)}
                    </Svg>

                    {/* Center Text: Total Spent */}
                    <View style={styles.chartTextContainer}>
                        <Text style={[styles.percentageLabel, { color: theme.icon, fontSize: 10 }]}>Total Spent</Text>
                        <Text style={[styles.percentageText, { color: theme.text, fontSize: 16 }]}>
                            {formatCurrency(expense)}
                        </Text>
                        <Text style={[styles.percentageLabel, { color: theme.expense, fontSize: 10, marginTop: 2 }]}>
                            {Math.round(expensePercentage * 100)}%
                        </Text>
                    </View>
                </View>

                {/* Legend & Stats */}
                <View style={styles.legendContainer}>
                    {/* Available Amount */}
                    <View style={styles.totalIncomeRow}>
                        <Text style={[styles.statLabel, { color: theme.icon }]}>Available Amount</Text>
                        <Text style={[styles.statValue, { color: theme.text }]}>{formatCurrency(income)}</Text>
                    </View>

                    <View style={styles.divider} />

                    {/* Expense Breakdown Legend */}
                    {expenseSegments.slice(0, 4).map((segment, index) => (
                        <View key={index} style={styles.legendItem}>
                            <View style={styles.legendLeft}>
                                <View style={[styles.dot, { backgroundColor: segment.color }]} />
                                <Text style={[styles.legendLabel, { color: theme.icon }]} numberOfLines={1}>
                                    {segment.name}
                                </Text>
                            </View>
                            <Text style={[styles.legendValue, { color: theme.text }]}>
                                {formatCurrency(segment.amount)}
                            </Text>
                        </View>
                    ))}
                    {expenseSegments.length === 0 && (
                        <Text style={{ color: theme.icon, fontStyle: 'italic', fontSize: 12 }}>No expenses yet</Text>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 24,
        padding: 20,
        marginHorizontal: 20,
        marginTop: 10,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: 'sans-serif',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    chartContainer: {
        width: 140,
        height: 140,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chartTextContainer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    percentageText: {
        fontSize: 18,
        fontWeight: '800',
    },
    percentageLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    legendContainer: {
        flex: 1,
        paddingLeft: 20,
        gap: 10,
        justifyContent: 'center',
    },
    totalIncomeRow: {
        marginBottom: 4,
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 4,
        opacity: 0.5,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    legendLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    legendValue: {
        fontSize: 12,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
    },
});