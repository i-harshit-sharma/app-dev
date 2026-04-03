import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import React, { useMemo } from 'react';
import {
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useTransactions } from '@/context/TransactionContext';
import { PurchaseSimulationModal } from '@/components/PurchaseSimulationModal';

const { width } = Dimensions.get('window');

const CATEGORY_CONFIG: Record<string, { icon: string; limit: number; color: 'danger' | 'warning' | 'success' }> = {
    Food: { icon: 'fast-food', limit: 8000, color: 'warning' },
    Transport: { icon: 'car', limit: 5000, color: 'success' },
    Shopping: { icon: 'bag', limit: 10000, color: 'danger' },
    Bills: { icon: 'document-text', limit: 8000, color: 'success' },
    Health: { icon: 'medical', limit: 5000, color: 'warning' },
    Others: { icon: 'ellipsis-horizontal', limit: 3000, color: 'success' },
};

function getWeekRange(): { start: Date; end: Date; label: string } {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(today.setDate(diff));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const formatDate = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    return { start: weekStart, end: weekEnd, label: `${formatDate(weekStart)} – ${formatDate(weekEnd)}` };
}

// Semi-circular gauge
const GAUGE_R = 72;
const GAUGE_CX = (width - 40) / 2;
const GAUGE_CY = 90;
const ARC_LENGTH = Math.PI * GAUGE_R;

function HealthScoreBadge({ score, theme }: { score: number; theme: any }) {
    const color = score >= 70 ? theme.success : score >= 40 ? theme.warning : theme.danger;
    const label = score >= 70 ? 'Healthy' : score >= 40 ? 'Fair' : 'At Risk';
    return (
        <View style={[styles.healthBadge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
            <View style={[styles.healthDot, { backgroundColor: color }]} />
            <Text style={[styles.healthBadgeText, { color }]}>{label}</Text>
        </View>
    );
}

export default function BudgetScreen() {
    const { theme: currentTheme } = useTheme();
    const { transactions, financialPlan, getWeeklyBudgetAllocation, getSafeToSpend, getFinancialHealth } = useTransactions();
    const [simulationModalVisible, setSimulationModalVisible] = React.useState(false);
    const theme = Colors[currentTheme];
    const isDark = currentTheme === 'dark';
    const weekRange = getWeekRange();

    const budgetData = useMemo(() => {
        const flatItems = transactions.flatMap((group) => group.items.map((item) => ({ ...item, date: group.date })));
        const weekExpenses = flatItems.filter((item) => {
            const itemDate = new Date(item.date);
            return item.type === 'expense' && itemDate >= weekRange.start && itemDate <= weekRange.end;
        });

        const weeklyBudget = getWeeklyBudgetAllocation(weekRange.start);
        const health = getFinancialHealth(new Date());
        const safeToSpend = getSafeToSpend(new Date());

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

        const categories = Object.entries(categoryMap).map(([cat, data]) => {
            const config = CATEGORY_CONFIG[cat] || { icon: 'ellipsis-horizontal', limit: weeklyBudget * 0.1, color: 'warning' as const };
            const dynamicLimit = Math.max(0, weeklyCategoryLimits[cat] ?? config.limit);
            const overspent = data.spent > dynamicLimit;
            return {
                id: cat, name: cat, spent: data.spent, limit: dynamicLimit,
                icon: config.icon, color: overspent ? 'danger' : config.color,
                suggestion: overspent,
                progress: dynamicLimit > 0 ? Math.min(data.spent / dynamicLimit, 1) : 0,
            };
        });

        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const upcomingExpenses = flatItems
            .filter((item) => {
                const itemDate = new Date(item.date);
                return item.type === 'expense' && itemDate > now && itemDate <= nextWeek;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 5);

        const totalMonthlyBudget = financialPlan.monthlyBudget;
        const monthlySpent = flatItems
            .filter((item) => {
                const d = new Date(item.date);
                return item.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            })
            .reduce((sum, item) => sum + Math.abs(item.amount), 0);

        const budgetUsagePercent = totalMonthlyBudget > 0 ? Math.min(100, (monthlySpent / totalMonthlyBudget) * 100) : 0;
        const remaining = Math.max(0, totalMonthlyBudget - monthlySpent);

        return {
            categories: categories.sort((a, b) => b.spent - a.spent),
            upcomingBills: upcomingExpenses.map((item, idx) => ({
                id: `${item.title}-${idx}`,
                name: item.title,
                date: new Date(item.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
                amount: Math.abs(item.amount),
                icon: CATEGORY_CONFIG[item.category || 'Others']?.icon || 'ellipsis-horizontal',
            })),
            safeToSpend: safeToSpend.safeToSpendToday,
            weeklyBudget,
            monthlySpent,
            totalMonthlyBudget,
            budgetUsagePercent,
            remaining,
            health,
        };
    }, [financialPlan.monthlyBudget, getFinancialHealth, getSafeToSpend, getWeeklyBudgetAllocation, transactions, weekRange]);

    const fgDash = (ARC_LENGTH * budgetData.budgetUsagePercent) / 100;
    const overBudget = budgetData.budgetUsagePercent >= 100;
    const gaugeColor = overBudget ? theme.danger : budgetData.budgetUsagePercent > 70 ? theme.warning : theme.success;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Header ── */}
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.headerLabel, { color: theme.icon }]}>OVERVIEW</Text>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>Budget</Text>
                    </View>
                    <View style={[styles.weekBadge, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Ionicons name="calendar-outline" size={12} color={theme.icon} />
                        <Text style={[styles.weekText, { color: theme.icon }]}>{weekRange.label}</Text>
                    </View>
                </View>

                {/* ── Monthly Budget Card ── */}
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    {/* Gauge */}
                    <View style={styles.gaugeWrapper}>
                        <Svg height={100} width={width - 40} viewBox={`0 0 ${width - 40} 100`}>
                            <Defs>
                                <SvgGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                                    <Stop offset="0" stopColor={theme.tint} stopOpacity="1" />
                                    <Stop offset="1" stopColor={theme.emerald} stopOpacity="1" />
                                </SvgGradient>
                            </Defs>
                            {/* Track */}
                            <Circle
                                cx={GAUGE_CX} cy={GAUGE_CY} r={GAUGE_R}
                                stroke={theme.border}
                                strokeWidth={10}
                                strokeDasharray={`${ARC_LENGTH} ${2 * Math.PI * GAUGE_R}`}
                                strokeLinecap="round"
                                fill="transparent"
                                rotation="-180"
                                originX={GAUGE_CX}
                                originY={GAUGE_CY}
                            />
                            {/* Fill */}
                            <Circle
                                cx={GAUGE_CX} cy={GAUGE_CY} r={GAUGE_R}
                                stroke={overBudget ? theme.danger : 'url(#gaugeGrad)'}
                                strokeWidth={10}
                                strokeDasharray={`${fgDash} ${2 * Math.PI * GAUGE_R}`}
                                strokeLinecap="round"
                                fill="transparent"
                                rotation="-180"
                                originX={GAUGE_CX}
                                originY={GAUGE_CY}
                            />
                        </Svg>

                        {/* Center text overlay */}
                        <View style={styles.gaugeCenterText}>
                            <Text style={[styles.gaugePercent, { color: theme.text }]}>
                                {Math.round(budgetData.budgetUsagePercent)}%
                            </Text>
                            <Text style={[styles.gaugeLabel, { color: theme.icon }]}>used</Text>
                        </View>
                    </View>

                    {/* Monthly spend row */}
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    <View style={styles.cardStatsRow}>
                        <View style={styles.cardStat}>
                            <Text style={[styles.cardStatLabel, { color: theme.icon }]}>Spent</Text>
                            <Text style={[styles.cardStatValue, { color: theme.expense }]}>
                                ₹{budgetData.monthlySpent.toLocaleString('en-IN')}
                            </Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                        <View style={styles.cardStat}>
                            <Text style={[styles.cardStatLabel, { color: theme.icon }]}>Budget</Text>
                            <Text style={[styles.cardStatValue, { color: theme.text }]}>
                                ₹{budgetData.totalMonthlyBudget.toLocaleString('en-IN')}
                            </Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                        <View style={styles.cardStat}>
                            <Text style={[styles.cardStatLabel, { color: theme.icon }]}>Left</Text>
                            <Text style={[styles.cardStatValue, { color: overBudget ? theme.danger : theme.success }]}>
                                ₹{budgetData.remaining.toLocaleString('en-IN')}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ── Safe-to-Spend + Health ── */}
                <View style={styles.rowCards}>
                    {/* Safe to spend */}
                    <View style={[styles.halfCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={[styles.halfCardIcon, { backgroundColor: theme.tint + '18' }]}>
                            <Ionicons name="shield-checkmark-outline" size={18} color={theme.tint} />
                        </View>
                        <Text style={[styles.halfCardLabel, { color: theme.icon }]}>Safe Today</Text>
                        <Text style={[styles.halfCardValue, { color: theme.text }]}>
                            ₹{budgetData.safeToSpend.toLocaleString('en-IN')}
                        </Text>
                    </View>

                    {/* Financial health */}
                    <View style={[styles.halfCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={[styles.halfCardIcon, { backgroundColor: theme.emerald + '18' }]}>
                            <Ionicons name="pulse-outline" size={18} color={theme.emerald} />
                        </View>
                        <Text style={[styles.halfCardLabel, { color: theme.icon }]}>Health Score</Text>
                        <Text style={[styles.halfCardValue, { color: theme.text }]}>
                            {Math.round(budgetData.health.score)}<Text style={{ fontSize: 13, color: theme.icon }}>/100</Text>
                        </Text>
                        <HealthScoreBadge score={budgetData.health.score} theme={theme} />
                    </View>
                </View>

                {/* ── Weekly Metrics ── */}
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, paddingVertical: 14 }]}>
                    <View style={styles.metricsRow}>
                        <View style={styles.metric}>
                            <Ionicons name="calendar" size={14} color={theme.tint} />
                            <Text style={[styles.metricLabel, { color: theme.icon }]}>Weekly Budget</Text>
                            <Text style={[styles.metricValue, { color: theme.text }]}>₹{budgetData.weeklyBudget.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: theme.border, height: 32 }]} />
                        <View style={styles.metric}>
                            <Ionicons name="trending-up" size={14} color={theme.emerald} />
                            <Text style={[styles.metricLabel, { color: theme.icon }]}>Savings Ratio</Text>
                            <Text style={[styles.metricValue, { color: theme.text }]}>{Math.round(budgetData.health.savingsRatio)}%</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: theme.border, height: 32 }]} />
                        <View style={styles.metric}>
                            <Ionicons name="git-compare" size={14} color={theme.warning} />
                            <Text style={[styles.metricLabel, { color: theme.icon }]}>Inc:Sav</Text>
                            <Text style={[styles.metricValue, { color: theme.text }]}>
                                {budgetData.health.effectiveIncomeToSavingsRatio > 0
                                    ? `${budgetData.health.effectiveIncomeToSavingsRatio.toFixed(1)}:1`
                                    : '—'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ── Upcoming Bills ── */}
                {budgetData.upcomingBills.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Upcoming</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                            {budgetData.upcomingBills.map((bill) => (
                                <View
                                    key={bill.id}
                                    style={[styles.billCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                                >
                                    <View style={[styles.billIconWrap, { backgroundColor: theme.tint + '18' }]}>
                                        <Ionicons name={bill.icon as any} size={16} color={theme.tint} />
                                    </View>
                                    <Text style={[styles.billName, { color: theme.text }]} numberOfLines={1}>{bill.name}</Text>
                                    <Text style={[styles.billDate, { color: theme.icon }]}>{bill.date}</Text>
                                    <Text style={[styles.billAmt, { color: theme.expense }]}>₹{bill.amount.toLocaleString('en-IN')}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* ── Category Breakdown ── */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>This Week</Text>

                    {budgetData.categories.length === 0 ? (
                        <View style={[styles.emptyState, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Ionicons name="wallet-outline" size={40} color={theme.icon} />
                            <Text style={[styles.emptyTitle, { color: theme.text }]}>No expenses yet</Text>
                            <Text style={[styles.emptySubtitle, { color: theme.icon }]}>Start tracking to see your budget breakdown</Text>
                        </View>
                    ) : (
                        budgetData.categories.map((cat) => {
                            const barColor = cat.color === 'danger' ? theme.danger : cat.color === 'warning' ? theme.warning : theme.success;
                            return (
                                <View
                                    key={cat.id}
                                    style={[styles.catRow, { backgroundColor: theme.card, borderColor: theme.border }]}
                                >
                                    <View style={[styles.catIconWrap, { backgroundColor: barColor + '18' }]}>
                                        <Ionicons name={cat.icon as any} size={16} color={barColor} />
                                    </View>
                                    <View style={styles.catInfo}>
                                        <View style={styles.catTopRow}>
                                            <Text style={[styles.catName, { color: theme.text }]}>{cat.name}</Text>
                                            <View style={styles.catAmounts}>
                                                <Text style={[styles.catSpent, { color: theme.text }]}>₹{cat.spent.toLocaleString('en-IN')}</Text>
                                                <Text style={[styles.catLimit, { color: theme.icon }]}> / ₹{cat.limit.toLocaleString('en-IN')}</Text>
                                            </View>
                                        </View>
                                        <View style={[styles.barBg, { backgroundColor: theme.border }]}>
                                            <View style={[styles.barFill, { width: `${cat.progress * 100}%`, backgroundColor: barColor }]} />
                                        </View>
                                        {cat.suggestion && (
                                            <Text style={[styles.overspentLabel, { color: theme.danger }]}>Over budget</Text>
                                        )}
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>

                <View style={{ height: 110 }} />
            </ScrollView>

            {/* ── FAB ── */}
            <TouchableOpacity
                style={styles.fabWrap}
                onPress={() => setSimulationModalVisible(true)}
                activeOpacity={0.85}
            >
                <LinearGradient
                    colors={[theme.tint, '#1565C0']}
                    style={styles.fab}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <MaterialCommunityIcons name="cart-outline" size={20} color="#FFF" />
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
    container: { flex: 1 },
    scroll: {
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 48 : 24,
        paddingBottom: 20,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 20,
    },
    headerLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 2 },
    headerTitle: { fontSize: 26, fontWeight: '800' },
    weekBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1,
    },
    weekText: { fontSize: 11, fontWeight: '600' },

    // Card
    card: {
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 14,
        overflow: 'hidden',
    },

    // Gauge
    gaugeWrapper: {
        alignItems: 'center',
        height: 106,
        justifyContent: 'flex-start',
        marginTop: 16,
    },
    gaugeCenterText: {
        position: 'absolute',
        bottom: 4,
        alignItems: 'center',
    },
    gaugePercent: { fontSize: 26, fontWeight: '800' },
    gaugeLabel: { fontSize: 12, fontWeight: '500', marginTop: -2 },

    divider: { height: 1, marginHorizontal: 16, marginTop: 4 },

    cardStatsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    cardStat: { flex: 1, alignItems: 'center', gap: 4 },
    cardStatLabel: { fontSize: 11, fontWeight: '600' },
    cardStatValue: { fontSize: 15, fontWeight: '800' },
    statDivider: { width: 1, alignSelf: 'stretch' },

    // Half cards row
    rowCards: { flexDirection: 'row', gap: 12, marginBottom: 14 },
    halfCard: {
        flex: 1, borderRadius: 20, borderWidth: 1,
        padding: 16, gap: 4,
    },
    halfCardIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    halfCardLabel: { fontSize: 11, fontWeight: '600' },
    halfCardValue: { fontSize: 20, fontWeight: '800' },

    // Health badge
    healthBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 20, borderWidth: 1,
        alignSelf: 'flex-start', marginTop: 4,
    },
    healthDot: { width: 6, height: 6, borderRadius: 3 },
    healthBadgeText: { fontSize: 10, fontWeight: '700' },

    // Metrics row
    metricsRow: { flexDirection: 'row', paddingHorizontal: 16, alignItems: 'center' },
    metric: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 6 },
    metricLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
    metricValue: { fontSize: 13, fontWeight: '800' },

    // Section title
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },

    // Upcoming bills
    billCard: {
        width: 148, borderRadius: 16, borderWidth: 1,
        padding: 14, gap: 4,
    },
    billIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
    billName: { fontSize: 13, fontWeight: '700' },
    billDate: { fontSize: 10, fontWeight: '500' },
    billAmt: { fontSize: 14, fontWeight: '800', marginTop: 4 },

    // Category rows
    catRow: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 16, borderWidth: 1,
        padding: 14, gap: 12, marginBottom: 10,
    },
    catIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    catInfo: { flex: 1, gap: 8 },
    catTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    catName: { fontSize: 14, fontWeight: '700' },
    catAmounts: { flexDirection: 'row', alignItems: 'baseline' },
    catSpent: { fontSize: 13, fontWeight: '700' },
    catLimit: { fontSize: 11 },
    barBg: { height: 5, borderRadius: 4, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 4 },
    overspentLabel: { fontSize: 10, fontWeight: '700', marginTop: -4 },

    // Empty state
    emptyState: {
        alignItems: 'center', padding: 40,
        borderRadius: 20, borderWidth: 1, gap: 6,
    },
    emptyTitle: { fontSize: 15, fontWeight: '700', marginTop: 4 },
    emptySubtitle: { fontSize: 12, fontWeight: '500', textAlign: 'center' },

    // FAB
    fabWrap: {
        position: 'absolute', bottom: 24, alignSelf: 'center',
        left: 20, right: 20,
        shadowColor: '#2979FF',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 14,
        elevation: 8,
    },
    fab: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 15, borderRadius: 30, gap: 8,
    },
    fabText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});