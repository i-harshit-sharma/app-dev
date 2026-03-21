import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import React, { useMemo } from 'react';
import { Dimensions, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useTransactions } from '@/context/TransactionContext';
import { PurchaseSimulationModal } from '@/components/PurchaseSimulationModal';

const { width } = Dimensions.get('window');

// Category icons and budget defaults
const CATEGORY_CONFIG: Record<string, { icon: string; limit: number; color: 'danger' | 'warning' | 'success' }> = {
    Food: { icon: 'fast-food', limit: 8000, color: 'warning' },
    Transport: { icon: 'car', limit: 5000, color: 'success' },
    Shopping: { icon: 'bag', limit: 10000, color: 'danger' },
    Bills: { icon: 'document-text', limit: 8000, color: 'success' },
    Health: { icon: 'medical', limit: 5000, color: 'warning' },
    Others: { icon: 'ellipsis-horizontal', limit: 3000, color: 'success' },
};

function getDayKey(date: Date): string {
    return date.toISOString().split('T')[0];
}

function getWeekRange(): { start: Date; end: Date; label: string } {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(today.setDate(diff));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const formatDate = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    return {
        start: weekStart,
        end: weekEnd,
        label: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
    };
}

export default function BudgetScreen() {
    const { theme: currentTheme } = useTheme();
    const { transactions, financialPlan, getWeeklyBudgetAllocation, getSafeToSpend, getFinancialHealth } = useTransactions();
    const [simulationModalVisible, setSimulationModalVisible] = React.useState(false);
    const theme = Colors[currentTheme];
    const isDark = currentTheme === 'dark';
    const weekRange = getWeekRange();

    // Compute budget data from transactions
    const budgetData = useMemo(() => {
        const flatItems = transactions.flatMap((group) => group.items.map((item) => ({ ...item, date: group.date })));
        const weekExpenses = flatItems.filter((item) => {
            const itemDate = new Date(item.date);
            return item.type === 'expense' && itemDate >= weekRange.start && itemDate <= weekRange.end;
        });

        const weeklyBudget = getWeeklyBudgetAllocation(weekRange.start);
        const health = getFinancialHealth(new Date());
        const safeToSpend = getSafeToSpend(new Date());

        // Group by category
        const categoryMap: Record<string, { spent: number; items: typeof flatItems }> = {};
        weekExpenses.forEach((item) => {
            const cat = item.category || 'Others';
            if (!categoryMap[cat]) categoryMap[cat] = { spent: 0, items: [] };
            categoryMap[cat].spent += Math.abs(item.amount);
            categoryMap[cat].items.push(item);
        });

        const weeklyCategoryLimits: Record<string, number> = {
            Food: weeklyBudget * 0.25,
            Transport: weeklyBudget * 0.15,
            Shopping: weeklyBudget * 0.15,
            Bills: weeklyBudget * 0.2,
            Health: weeklyBudget * 0.1,
            Others: weeklyBudget * 0.15,
        };

        // Build category list with spending vs limits
        const categories = Object.entries(categoryMap).map(([cat, data]) => {
            const config = CATEGORY_CONFIG[cat] || { icon: 'ellipsis-horizontal', limit: weeklyBudget * 0.1, color: 'warning' as const };
            const dynamicLimit = Math.max(0, weeklyCategoryLimits[cat] ?? config.limit);
            const overspent = data.spent > dynamicLimit;
            return {
                id: cat,
                name: cat,
                spent: data.spent,
                limit: dynamicLimit,
                icon: config.icon,
                color: overspent ? 'danger' : config.color,
                suggestion: data.spent > dynamicLimit,
                progress: dynamicLimit > 0 ? (data.spent / dynamicLimit) : 0,
            };
        });

        // Find upcoming bills (bills in the next 7 days after today)
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const upcomingExpenses = flatItems
            .filter((item) => {
                const itemDate = new Date(item.date);
                return item.type === 'expense' && itemDate > now && itemDate <= nextWeek;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 5);

        // Calculate monthly stats from configured budget
        const totalMonthlyBudget = financialPlan.monthlyBudget;
        const monthlySpent = flatItems
            .filter((item) => {
                const d = new Date(item.date);
                return item.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            })
            .reduce((sum, item) => sum + Math.abs(item.amount), 0);
        const upcomingBillsTotal = upcomingExpenses.reduce((sum, item) => sum + item.amount, 0);
        const budgetUsagePercent = totalMonthlyBudget > 0 ? Math.min(100, (monthlySpent / totalMonthlyBudget) * 100) : 0;

        return {
            categories: categories.sort((a, b) => b.spent - a.spent),
            upcomingBills: upcomingExpenses.map((item, idx) => ({
                id: `${item.title}-${idx}`,
                name: item.title,
                date: `Due ${new Date(item.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}`,
                amount: Math.abs(item.amount),
                icon: CATEGORY_CONFIG[item.category || 'Others']?.icon || 'ellipsis-horizontal',
            })),
            safeToSpend: safeToSpend.safeToSpendToday,
            safeMonthlyRemaining: safeToSpend.remainingMonthlyBudget,
            weeklyBudget,
            upcomingTotal: upcomingBillsTotal,
            monthlySpent,
            totalMonthlyBudget,
            budgetUsagePercent,
            health,
        };
    }, [financialPlan.monthlyBudget, getFinancialHealth, getSafeToSpend, getWeeklyBudgetAllocation, transactions, weekRange]);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Weekly Budget</Text>
                    <TouchableOpacity style={[styles.dateBadge, { backgroundColor: theme.card }]}>
                        <Text style={[styles.dateText, { color: theme.text }]}>{weekRange.label}</Text>
                        <Ionicons name="chevron-down" size={12} color={theme.text} />
                    </TouchableOpacity>
                </View>

                {/* Hero: Safe-to-Spend Gauge */}
                <View style={[styles.heroSection, { backgroundColor: theme.card }]}>
                    <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 20 }}>
                        {budgetData.categories.length > 0 ? (
                            <Svg height={120} width={width * 0.8} viewBox={`0 0 ${width * 0.8} 140`}>
                                <Defs>
                                    <SvgGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                                        <Stop offset="0" stopColor={theme.emerald} stopOpacity="1" />
                                        <Stop offset="1" stopColor={theme.tint} stopOpacity="1" />
                                    </SvgGradient>
                                </Defs>
                                {/* Background Arc */}
                                <Circle
                                    cx={width * 0.4}
                                    cy={100}
                                    r={80}
                                    stroke={isDark ? '#333' : '#F3F4F6'}
                                    strokeWidth={16}
                                    strokeDasharray={`${Math.PI * 80} ${2 * Math.PI * 80}`}
                                    strokeLinecap="round"
                                    fill="transparent"
                                    rotation="-180"
                                    originX={width * 0.4}
                                    originY={100}
                                />
                                {/* Foreground Arc */}
                                <Circle
                                    cx={width * 0.4}
                                    cy={100}
                                    r={80}
                                    stroke="url(#grad)"
                                    strokeWidth={16}
                                    strokeDasharray={`${(Math.PI * 80 * budgetData.budgetUsagePercent) / 100} ${2 * Math.PI * 80}`}
                                    strokeLinecap="round"
                                    fill="transparent"
                                    rotation="-180"
                                    originX={width * 0.4}
                                    originY={100}
                                />
                            </Svg>
                        ) : null}

                        {/* Center Text */}
                        <View style={[styles.gaugeTextContainer, { bottom: 0 }]}>
                            <Text style={[styles.safeLabel, { color: theme.icon }]}>Safe to Spend Today</Text>
                            <Text style={[styles.amountText, { color: theme.text }]}>₹{budgetData.safeToSpend.toLocaleString('en-IN')}</Text>
                            <Text style={[styles.subtitleText, { color: theme.icon }]}>Based on budget pace + days left</Text>
                        </View>
                    </View>

                    {/* Quick Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.statPill}>
                            <Text style={[styles.statLabel, { color: theme.icon }]}>Month Spent</Text>
                            <Text style={[styles.statValue, { color: theme.text }]}>₹{budgetData.monthlySpent.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={styles.statPill}>
                            <Text style={[styles.statLabel, { color: theme.icon }]}>Budget</Text>
                            <Text style={[styles.statValue, { color: theme.text }]}>₹{budgetData.totalMonthlyBudget.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={styles.statPill}>
                            <Text style={[styles.statLabel, { color: theme.icon }]}>Weekly Budget</Text>
                            <Text style={[styles.statValue, { color: theme.text }]}>₹{budgetData.weeklyBudget.toLocaleString('en-IN')}</Text>
                        </View>
                    </View>
                </View>

                <View style={[styles.sectionContainer, { marginTop: -10 }]}> 
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Financial Health</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statPill}>
                            <Text style={[styles.statLabel, { color: theme.icon }]}>Score</Text>
                            <Text style={[styles.statValue, { color: theme.text }]}>{Math.round(budgetData.health.score)}/100</Text>
                        </View>
                        <View style={styles.statPill}>
                            <Text style={[styles.statLabel, { color: theme.icon }]}>Savings Ratio</Text>
                            <Text style={[styles.statValue, { color: theme.text }]}>{Math.round(budgetData.health.savingsRatio)}%</Text>
                        </View>
                        <View style={styles.statPill}>
                            <Text style={[styles.statLabel, { color: theme.icon }]}>Eff. Income:Saving</Text>
                            <Text style={[styles.statValue, { color: theme.text }]}>{budgetData.health.effectiveIncomeToSavingsRatio > 0 ? `${budgetData.health.effectiveIncomeToSavingsRatio.toFixed(1)}:1` : '—'}</Text>
                        </View>
                    </View>
                </View>

                {/* Upcoming Bills */}
                {budgetData.upcomingBills.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Upcoming Bills (Next 7 Days)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.costsScroll}>
                            {budgetData.upcomingBills.map((bill) => (
                                <View key={bill.id} style={[
                                    styles.billCard,
                                    { backgroundColor: isDark ? 'rgba(41, 121, 255, 0.15)' : 'rgba(41, 121, 255, 0.05)', borderColor: theme.border }
                                ]}>
                                    <View style={[styles.billIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#FFF' }]}>
                                        <MaterialCommunityIcons name={bill.icon as any} size={20} color={theme.text} />
                                    </View>
                                    <View>
                                        <Text style={[styles.billName, { color: theme.text }]}>{bill.name}</Text>
                                        <Text style={[styles.billDate, { color: theme.icon }]}>{bill.date}</Text>
                                    </View>
                                    <Text style={[styles.billAmount, { color: theme.text }]}>₹{bill.amount.toLocaleString('en-IN')}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Smart Envelopes */}
                {budgetData.categories.length > 0 ? (
                    <View style={styles.sectionContainer}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Category Breakdown (This Week)</Text>
                        <View style={styles.grid}>
                            {budgetData.categories.map((cat) => (
                                <View key={cat.id} style={[styles.envelopeCard, { backgroundColor: theme.card, shadowColor: theme.text }]}>
                                    {cat.suggestion && (
                                        <View style={[styles.suggestionBadge, { backgroundColor: theme.tint }]}>
                                            <MaterialCommunityIcons name="alert-circle" size={10} color="#FFF" />
                                            <Text style={styles.suggestionText}>Overspent</Text>
                                        </View>
                                    )}

                                    <View style={styles.envelopeHeader}>
                                        <View style={[styles.catIcon, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}>
                                            <Ionicons name={cat.icon as any} size={18} color={theme.text} />
                                        </View>
                                        <Text style={[styles.catName, { color: theme.text }]}>{cat.name}</Text>
                                    </View>

                                    <View style={styles.progressContainer}>
                                        <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#333' : '#E5E7EB' }]}>
                                            <View style={[
                                                styles.progressBarFill,
                                                {
                                                    width: `${Math.min(cat.progress * 100, 100)}%`,
                                                    backgroundColor: cat.color === 'danger' ? theme.expense : cat.color === 'warning' ? theme.warning : theme.income
                                                }
                                            ]} />
                                        </View>
                                        <View style={styles.amountRow}>
                                            <Text style={[styles.spentText, { color: theme.text }]}>₹{cat.spent.toLocaleString('en-IN')}</Text>
                                            <Text style={[styles.limitText, { color: theme.icon }]}> / ₹{cat.limit.toLocaleString('en-IN')}</Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : (
                    <View style={[styles.sectionContainer, { alignItems: 'center', paddingVertical: 40 }]}>
                        <Ionicons name="wallet-outline" size={48} color={theme.icon} />
                        <Text style={[styles.emptyText, { color: theme.icon, marginTop: 12 }]}>No expenses this week</Text>
                        <Text style={[styles.emptySubtext, { color: theme.icon }]}>Start tracking to see your budget breakdown</Text>
                    </View>
                )}

                {/* Spacer for FAB */}
                <View style={{ height: 100 }} />

            </ScrollView>


            {/* Floating Action Button */}
            <TouchableOpacity
                style={styles.fabContainer}
                onPress={() => setSimulationModalVisible(true)}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={[theme.electricBlue || '#2979FF', '#2196F3']}
                    style={styles.fab}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <MaterialCommunityIcons name="cart-outline" size={24} color="#FFF" />
                    <Text style={styles.fabText}>Simulate Purchase</Text>
                </LinearGradient>
            </TouchableOpacity>

            <PurchaseSimulationModal
                visible={simulationModalVisible}
                onClose={() => setSimulationModalVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
    },
    dateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    dateText: {
        fontSize: 12,
        fontWeight: '600',
    },
    heroSection: {
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        marginBottom: 30,
        // Soft shadow
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    gaugeTextContainer: {
        position: 'absolute',
        alignItems: 'center',
        bottom: 20,
    },
    safeLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    amountText: {
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 2,
    },
    subtitleText: {
        fontSize: 12,
    },
    sectionContainer: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 15,
    },
    costsScroll: {
        overflow: 'visible',
    },
    billCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingRight: 16,
        borderRadius: 16,
        marginRight: 12,
        borderWidth: 1,
        gap: 12,
        minWidth: 200,
    },
    billIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    billName: {
        fontSize: 14,
        fontWeight: '600',
    },
    billDate: {
        fontSize: 10,
    },
    billAmount: {
        marginLeft: 'auto',
        fontSize: 14,
        fontWeight: '700',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    envelopeCard: {
        width: '48%',
        borderRadius: 20,
        padding: 16,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    envelopeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    catIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    catName: {
        fontSize: 14,
        fontWeight: '600',
    },
    progressContainer: {
        gap: 6,
    },
    progressBarBg: {
        height: 6,
        borderRadius: 3,
        width: '100%',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    spentText: {
        fontSize: 14,
        fontWeight: '700',
    },
    limitText: {
        fontSize: 12,
    },
    suggestionBadge: {
        position: 'absolute',
        top: -8,
        right: 10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
        zIndex: 10,
    },
    suggestionText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
        justifyContent: 'space-between',
    },
    statPill: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.04)',
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '800',
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '700',
    },
    emptySubtext: {
        fontSize: 13,
        fontWeight: '500',
    },
    fabContainer: {
        position: 'absolute',
        bottom: 24,
        right: 20,
        shadowColor: '#2979FF',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    fab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 30,
        gap: 8,
    },
    fabText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
    },
});