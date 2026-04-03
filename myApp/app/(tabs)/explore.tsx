import CashFlowSankey from '@/components/trends/CashFlowSankey';
import FinancialHealthRadar from '@/components/trends/FinancialHealthRadar';
import GeoSpendingBubbles from '@/components/trends/GeoSpendingBubbles';
import MonthlyWaterfallChart from '@/components/trends/MonthlyWaterfallChart';
import PredictiveBalanceChart from '@/components/trends/PredictiveBalanceChart';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { LongTermGoal, TransactionItem, useTransactions } from '@/context/TransactionContext';
import { useTheme } from '@/context/ThemeContext';
import { InsightFeedService } from '@/services/InsightFeedService';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type MonthStat = {
  monthStart: Date;
  income: number;
  expense: number;
  savings: number;
  budgetAdherence: number;
  savingsRate: number;
  categoryTotals: Record<string, number>;
};

type Signal = {
  key: 'savings' | 'stability' | 'discipline' | 'runway' | 'cashflow';
  label: string;
  score: number;
  note: string;
};

type GoalMomentum = {
  id: string;
  title: string;
  progressPercent: number;
  etaMonths: number | null;
  momentumAmount: number;
  status: 'Ahead' | 'On Track' | 'Behind';
};

const ONE_DAY = 24 * 60 * 60 * 1000;

function absAmount(item: TransactionItem): number {
  return Math.abs(Number(item.amount) || 0);
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatCurrency(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `₹${Math.round(safe).toLocaleString('en-IN')}`;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (!values.length) return 0;
  const mean = average(values);
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
  return Math.sqrt(variance);
}

function getMonthStats(flat: Array<TransactionItem & { date: Date }>, date: Date, monthlyBudget: number): MonthStat {
  const month = date.getMonth();
  const year = date.getFullYear();
  let income = 0;
  let expense = 0;
  const categoryTotals: Record<string, number> = {};

  flat.forEach((item) => {
    if (item.date.getMonth() !== month || item.date.getFullYear() !== year) return;
    if (item.type === 'income') {
      income += absAmount(item);
    } else {
      const value = absAmount(item);
      expense += value;
      const key = item.category || 'Others';
      categoryTotals[key] = (categoryTotals[key] || 0) + value;
    }
  });

  const savings = income - expense;
  const overspend = Math.max(0, expense - Math.max(0, monthlyBudget));
  const budgetAdherence = monthlyBudget > 0 ? Math.max(0, 1 - (overspend / monthlyBudget)) : 0.6;
  const savingsRate = income > 0 ? (Math.max(0, savings) / income) : 0;

  return {
    monthStart: monthStart(date),
    income,
    expense,
    savings,
    budgetAdherence,
    savingsRate,
    categoryTotals,
  };
}

function getHealthLabel(score: number): string {
  if (score >= 85) return 'Strong';
  if (score >= 70) return 'Stable';
  if (score >= 50) return 'Needs Attention';
  return 'Risk Zone';
}

function getSavingsStrengthScore(rate: number): number {
  if (rate < 0.05) return 10;
  if (rate < 0.1) return 30;
  if (rate < 0.2) return 60;
  if (rate < 0.3) return 80;
  return 100;
}

function getExpenseStabilityScore(stability: number): number {
  if (stability < 0.5) return 20;
  if (stability < 0.7) return 50;
  if (stability < 0.9) return 80;
  return 100;
}

function getRunwayScore(runwayMonths: number): number {
  if (runwayMonths < 1) return 10;
  if (runwayMonths < 3) return 40;
  if (runwayMonths < 6) return 70;
  return 100;
}

function getCashFlowDirectionScore(delta: number): { score: number; label: 'Declining' | 'Flat' | 'Improving' } {
  if (delta < -2000) return { score: 30, label: 'Declining' };
  if (delta > 2000) return { score: 100, label: 'Improving' };
  return { score: 60, label: 'Flat' };
}

function buildGoalMomentum(goals: LongTermGoal[], monthlySavingRate: number): GoalMomentum[] {
  const now = new Date();

  return [...goals]
    .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
    .slice(0, 2)
    .map((goal) => {
      const target = Math.max(0, Number(goal.targetAmount) || 0);
      const saved = Math.max(0, Number(goal.currentSaved) || 0);
      const progress = target > 0 ? clamp((saved / target) * 100, 0, 100) : 0;

      const startDate = new Date(goal.createdAt);
      const targetDate = new Date(goal.targetDate);
      const totalDuration = Math.max(1, targetDate.getTime() - startDate.getTime());
      const elapsed = clamp((now.getTime() - startDate.getTime()) / totalDuration, 0, 1);
      const expectedProgress = elapsed * 100;

      const momentumPercent = progress - expectedProgress;
      const momentumAmount = ((momentumPercent / 100) * target);

      const remaining = Math.max(0, target - saved);
      const etaMonths = monthlySavingRate > 0 ? Math.ceil(remaining / monthlySavingRate) : null;

      let status: GoalMomentum['status'] = 'On Track';
      if (momentumPercent > 5) status = 'Ahead';
      else if (momentumPercent < -5) status = 'Behind';

      return {
        id: goal.id,
        title: goal.title,
        progressPercent: progress,
        etaMonths,
        momentumAmount,
        status,
      };
    });
}

export default function TrendsScreen() {
  const { user } = useAuth();
  const { theme: currentTheme } = useTheme();
  const theme = Colors[currentTheme];
  const { transactions, netWorth, financialPlan, goals } = useTransactions();

  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [aiSource, setAiSource] = useState<'online' | 'offline'>('offline');

  const trends = useMemo(() => {
    const flat = transactions.flatMap((group) => group.items.map((item) => ({ ...item, date: group.date })));
    const now = new Date();
    const currentMonthStart = monthStart(now);

    const monthSeries = Array.from({ length: 6 }, (_, idx) => {
      const date = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - idx, 1);
      return getMonthStats(flat, date, financialPlan.monthlyBudget);
    });

    const current = monthSeries[0];
    const prev3 = monthSeries.slice(1, 4);
    const priorQuarter = monthSeries.slice(3, 6);

    const fixedObligations = financialPlan.fixedObligations.emi
      + financialPlan.fixedObligations.rentAndUtilities
      + financialPlan.fixedObligations.otherFixed;
    const savingsPlan = financialPlan.savingsInvestments.sip
      + financialPlan.savingsInvestments.mutualFunds
      + financialPlan.savingsInvestments.otherSavings;

    const effectiveIncome = Math.max(0, (current.income || financialPlan.monthlyIncome) - fixedObligations);
    const realizedSavings = Math.max(0, current.savings);
    const savingsBase = Math.max(savingsPlan, realizedSavings);
    const savingsRate = effectiveIncome > 0 ? (savingsBase / effectiveIncome) : 0;
    const savingsStrengthScore = getSavingsStrengthScore(savingsRate);

    const spendWindow = [current.expense, ...prev3.map((m) => m.expense)].filter((value) => value > 0);
    const avgSpend = average(spendWindow);
    const stabilityRaw = avgSpend > 0 ? 1 - (stdDev(spendWindow) / avgSpend) : 1;
    const stability = Math.max(0, stabilityRaw);
    const expenseStabilityScore = getExpenseStabilityScore(stability);

    const overspend = Math.max(0, current.expense - financialPlan.monthlyBudget);
    const budgetDiscipline = financialPlan.monthlyBudget > 0
      ? Math.max(0, 1 - (overspend / financialPlan.monthlyBudget))
      : 0.6;
    const budgetDisciplineScore = clamp(Math.round(budgetDiscipline * 100));

    const monthlyExpenseBaseline = average([current.expense, ...prev3.map((m) => m.expense)].filter((value) => value > 0)) || 1;
    const runwayMonths = netWorth / monthlyExpenseBaseline;
    const runwayScore = getRunwayScore(runwayMonths);

    const avgPrevSavings = average(prev3.map((m) => m.savings));
    const cashFlowDelta = current.savings - avgPrevSavings;
    const cashFlowDirection = getCashFlowDirectionScore(cashFlowDelta);

    const healthScore = Math.round(
      0.30 * savingsStrengthScore
      + 0.20 * expenseStabilityScore
      + 0.20 * budgetDisciplineScore
      + 0.15 * runwayScore
      + 0.15 * cashFlowDirection.score
    );

    const signals: Signal[] = [
      {
        key: 'savings',
        label: 'Savings Strength',
        score: savingsStrengthScore,
        note: `Saving ${Math.round(savingsRate * 100)}% of effective income`,
      },
      {
        key: 'stability',
        label: 'Expense Stability',
        score: expenseStabilityScore,
        note: `Stability index ${stability.toFixed(2)}`,
      },
      {
        key: 'discipline',
        label: 'Budget Discipline',
        score: budgetDisciplineScore,
        note: overspend > 0 ? `Overspend ${formatCurrency(overspend)}` : 'Within budget this month',
      },
      {
        key: 'runway',
        label: 'Financial Runway',
        score: runwayScore,
        note: `${runwayMonths.toFixed(1)} months of runway`,
      },
      {
        key: 'cashflow',
        label: 'Cash Flow Direction',
        score: cashFlowDirection.score,
        note: `${cashFlowDirection.label} vs last 3-month average`,
      },
    ];

    const strengths = [...signals].sort((a, b) => b.score - a.score).slice(0, 2);
    const weaknesses = [...signals].sort((a, b) => a.score - b.score).slice(0, 2);

    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remainingDays = Math.max(0, daysInMonth - dayOfMonth);
    const currentDailySpend = current.expense / Math.max(1, dayOfMonth);
    const avgDailySpend3m = average(prev3.map((m) => m.expense / Math.max(1, new Date(m.monthStart.getFullYear(), m.monthStart.getMonth() + 1, 0).getDate())).filter((v) => v > 0));
    const velocity = avgDailySpend3m > 0 ? currentDailySpend / avgDailySpend3m : 1;
    const velocityDeltaPercent = Math.round((velocity - 1) * 100);

    const categoryMap: Record<string, { current: number; pastAverage: number; drift: number }> = {};
    const prevCategoryTotals = prev3.reduce<Record<string, number[]>>((acc, month) => {
      Object.entries(month.categoryTotals).forEach(([category, value]) => {
        if (!acc[category]) acc[category] = [];
        acc[category].push(value);
      });
      return acc;
    }, {});

    const allCategories = new Set([...Object.keys(current.categoryTotals), ...Object.keys(prevCategoryTotals)]);
    allCategories.forEach((category) => {
      const currentSpend = current.categoryTotals[category] || 0;
      const pastAverage = average(prevCategoryTotals[category] || []);
      const drift = pastAverage > 0 ? ((currentSpend - pastAverage) / pastAverage) : (currentSpend > 0 ? 1 : 0);
      categoryMap[category] = { current: currentSpend, pastAverage, drift };
    });

    const topDrift = Object.entries(categoryMap)
      .filter(([, value]) => value.current > 0 || value.pastAverage > 0)
      .sort((a, b) => Math.abs(b[1].drift) - Math.abs(a[1].drift))
      .slice(0, 2)
      .map(([category, value]) => ({
        category,
        percent: Math.round(value.drift * 100),
      }));

    const currentSavingsRate = current.income > 0 ? (current.savings / current.income) : 0;
    const prevSavingsRate = average(prev3.map((m) => (m.income > 0 ? m.savings / m.income : 0)));
    const savingsTrend = currentSavingsRate - prevSavingsRate;

    const currentAdherence = current.budgetAdherence;
    const prevAdherence = average(prev3.map((m) => m.budgetAdherence));
    const adherenceTrend = currentAdherence - prevAdherence;

    const prevSpendOnly = prev3.map((m) => m.expense).filter((v) => v > 0);
    const prevStability = average(prevSpendOnly) > 0 ? 1 - (stdDev(prevSpendOnly) / average(prevSpendOnly)) : 1;
    const stabilityTrend = stability - prevStability;

    const momentumScore = (savingsTrend * 100) + (adherenceTrend * 80) + (stabilityTrend * 60);
    const momentumLabel = momentumScore > 8 ? 'Improving' : momentumScore < -8 ? 'Weakening' : 'Flat';

    const momentumDrivers = [
      `${savingsTrend >= 0 ? 'Savings rate up' : 'Savings rate down'} ${Math.abs(Math.round(savingsTrend * 100))}%`,
      `${adherenceTrend >= 0 ? 'Budget adherence improved' : 'Budget adherence slipped'} ${Math.abs(Math.round(adherenceTrend * 100))}%`,
      `${stabilityTrend >= 0 ? 'Spending became steadier' : 'Spending became noisier'}`,
    ];

    const monthlySavingRate = Math.max(0, average(prev3.map((m) => Math.max(0, m.savings))));
    const goalMomentum = buildGoalMomentum(goals, monthlySavingRate);

    const priorQuarterExpense = average(priorQuarter.map((m) => m.expense).filter((v) => v > 0));
    const priorRunwayMonths = priorQuarterExpense > 0 ? netWorth / priorQuarterExpense : runwayMonths;

    const dailyNetMap = new Map<string, number>();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

    flat.forEach((item) => {
      const d = new Date(item.date.getFullYear(), item.date.getMonth(), item.date.getDate());
      const key = dayKey(d);
      const currentNet = dailyNetMap.get(key) || 0;
      const delta = item.type === 'income' ? absAmount(item) : -absAmount(item);
      dailyNetMap.set(key, currentNet + delta);
    });

    const actualData = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(startOfToday.getTime() - (6 - index) * ONE_DAY);
      const label = index === 6 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
      return { date, label, dailyNet: dailyNetMap.get(dayKey(date)) || 0 };
    });

    const actualBalances = new Array(actualData.length).fill(0);
    actualBalances[actualData.length - 1] = netWorth;
    for (let i = actualData.length - 1; i > 0; i -= 1) {
      actualBalances[i - 1] = actualBalances[i] - actualData[i].dailyNet;
    }

    const actualSeries = actualData.map((entry, index) => ({
      label: entry.label,
      value: Math.max(0, Number(actualBalances[index].toFixed(2))),
    }));

    const averageDailyNet = average(actualData.map((entry) => entry.dailyNet));
    const projectedSeries = Array.from({ length: 7 }, (_, index) => {
      const label = index === 0 ? 'Today' : new Date(startOfToday.getTime() + index * ONE_DAY).toLocaleDateString('en-US', { weekday: 'short' });
      return {
        label,
        value: Math.max(0, Number((netWorth + averageDailyNet * index).toFixed(2))),
      };
    });

    const expectedIncomeRemaining = Math.max(0, financialPlan.monthlyIncome - current.income);
    const predictedSpend = currentDailySpend * remainingDays;
    const predictedEndBalance = netWorth + expectedIncomeRemaining - predictedSpend;

    const fallbackInsights = [
      velocity > 1
        ? `You are spending ${Math.abs(velocityDeltaPercent)}% faster than your 3-month norm. Cut one flexible category this week.`
        : `Your spending pace is ${Math.abs(velocityDeltaPercent)}% below your normal pattern. Keep this pace to improve surplus.`,
      topDrift[0]
        ? `${topDrift[0].category} drift is ${topDrift[0].percent >= 0 ? '+' : ''}${topDrift[0].percent}%. Recheck recurring behavior in this category.`
        : 'Category behavior is stable this month. Keep tracking to maintain predictability.',
      `Runway is ${runwayMonths.toFixed(1)} months${runwayMonths < priorRunwayMonths ? ' and declining' : ' and improving'} versus last quarter.`,
      `At current pace, predicted month-end balance is ${formatCurrency(predictedEndBalance)}.`,
    ];

    const contextSummary = [
      `Current month income: ${formatCurrency(current.income)}`,
      `Current month expense: ${formatCurrency(current.expense)}`,
      `Financial health score: ${healthScore}`,
      `Spending velocity ratio: ${velocity.toFixed(2)}`,
      `Top category drifts: ${topDrift.map((d) => `${d.category} ${d.percent >= 0 ? '+' : ''}${d.percent}%`).join(', ') || 'None'}`,
      `Money momentum: ${momentumLabel}`,
      `Runway now: ${runwayMonths.toFixed(1)} months; prior quarter: ${priorRunwayMonths.toFixed(1)} months`,
      `Predicted end balance: ${formatCurrency(predictedEndBalance)}`,
    ].join('\n');

    return {
      current,
      healthScore,
      healthLabel: getHealthLabel(healthScore),
      healthTrendUp: cashFlowDirection.label === 'Improving',
      healthSignals: signals,
      strengths,
      weaknesses,
      velocity,
      velocityDeltaPercent,
      topDrift,
      momentumLabel,
      momentumDrivers,
      goalMomentum,
      runwayMonths,
      priorRunwayMonths,
      actualSeries,
      projectedSeries,
      predictedEndBalance,
      fixedObligations,
      variableOutflow: Math.max(0, current.expense - fixedObligations),
      savingsOutflow: Math.max(0, current.savings),
      geoPoints: flat
        .filter((item) => (
          item.type === 'expense'
          && item.date.getMonth() === now.getMonth()
          && item.date.getFullYear() === now.getFullYear()
        ))
        .slice(0, 30)
        .map((item) => ({
          id: item.id,
          amount: absAmount(item),
          title: item.title,
          category: item.category,
          paymentMethod: item.paymentMethod,
          latitude: item.latitude,
          longitude: item.longitude,
          location: item.location,
        })),
      contextSummary,
      fallbackInsights,
    };
  }, [transactions, netWorth, financialPlan, goals]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const result = await InsightFeedService.getLaunchInsights({
        userId: user?.id,
        contextSummary: trends.contextSummary,
        fallbackInsights: trends.fallbackInsights,
        count: 2,
      });

      if (!mounted) return;
      setAiInsights(result.insights);
      setAiSource(result.source);
    })();

    return () => {
      mounted = false;
    };
  }, [trends.contextSummary, trends.fallbackInsights, user?.id]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={currentTheme === 'dark' ? 'light-content' : 'dark-content'} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.primaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
          <View style={styles.rowBetween}>
            <View>
              <Text style={[styles.cardEyebrow, { color: theme.tint }]}>Primary Signal</Text>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Financial Health Score</Text>
              <Text style={[styles.cardSubtitle, { color: theme.icon }]}>If your current behavior continues, your finances are {trends.healthTrendUp ? 'strengthening' : 'weakening'}.</Text>
            </View>
            <View style={[styles.scoreBadge, { backgroundColor: currentTheme === 'dark' ? '#243042' : '#EAF1FF' }]}>
              <View style={styles.rowCenter}>
                <Ionicons name={trends.healthTrendUp ? 'arrow-up' : 'arrow-down'} size={14} color={trends.healthTrendUp ? theme.income : theme.expense} />
                <Text style={[styles.scoreValue, { color: theme.text }]}>{trends.healthScore}</Text>
              </View>
              <Text style={[styles.scoreLabel, { color: theme.icon }]}>{trends.healthLabel}</Text>
            </View>
          </View>

          <View style={styles.twoColumn}>
            <View style={[styles.miniListCard, { borderColor: theme.border, backgroundColor: currentTheme === 'dark' ? '#1D2734' : '#F8FBFF' }]}> 
              <Text style={[styles.miniListTitle, { color: theme.income }]}>Strengths</Text>
              {trends.strengths.map((item) => (
                <Text key={item.key} style={[styles.miniListItem, { color: theme.text }]}>
                  • {item.label}: {item.note}
                </Text>
              ))}
            </View>
            <View style={[styles.miniListCard, { borderColor: theme.border, backgroundColor: currentTheme === 'dark' ? '#2D2227' : '#FFF8F6' }]}> 
              <Text style={[styles.miniListTitle, { color: theme.expense }]}>Needs Attention</Text>
              {trends.weaknesses.map((item) => (
                <Text key={item.key} style={[styles.miniListItem, { color: theme.text }]}>
                  • {item.label}: {item.note}
                </Text>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.signalCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
          <Text style={[styles.signalTitle, { color: theme.text }]}>Spending Velocity</Text>
          <Text style={[styles.signalValue, { color: trends.velocity > 1 ? theme.expense : theme.income }]}>
            {trends.velocity > 1 ? '+' : '-'}{Math.abs(trends.velocityDeltaPercent)}%
          </Text>
          <Text style={[styles.signalText, { color: theme.icon }]}>
            You are spending {Math.abs(trends.velocityDeltaPercent)}% {trends.velocity > 1 ? 'faster' : 'slower'} than your normal monthly pace.
          </Text>
        </View>

        <FinancialHealthRadar
          data={trends.healthSignals.map((signal) => ({
            label: signal.label.replace(' ', '\n'),
            value: signal.score,
            fullMark: 100,
          }))}
          score={trends.healthScore}
          subtitle="Behavior radar across five weighted resilience signals"
        />

        <MonthlyWaterfallChart
          steps={[
            { label: 'Income', value: trends.current.income || financialPlan.monthlyIncome },
            { label: 'Fixed', value: -trends.fixedObligations },
            { label: 'Variable', value: -trends.variableOutflow },
            { label: 'Savings', value: -trends.savingsOutflow },
            { label: 'Net', value: trends.predictedEndBalance },
          ]}
        />

        <CashFlowSankey
          income={trends.current.income || financialPlan.monthlyIncome}
          fixed={trends.fixedObligations}
          variable={trends.variableOutflow}
          savings={trends.savingsOutflow}
        />

        <GeoSpendingBubbles points={trends.geoPoints} />

        <View style={[styles.signalCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
          <Text style={[styles.signalTitle, { color: theme.text }]}>Category Drift</Text>
          {trends.topDrift.length ? trends.topDrift.map((item) => (
            <View key={item.category} style={styles.rowBetween}>
              <Text style={[styles.signalText, { color: theme.text }]}>{item.category}</Text>
              <Text style={[styles.driftValue, { color: item.percent >= 0 ? theme.expense : theme.income }]}>
                {item.percent >= 0 ? '+' : ''}{item.percent}%
              </Text>
            </View>
          )) : (
            <Text style={[styles.signalText, { color: theme.icon }]}>No significant category drift this month.</Text>
          )}
        </View>

        <View style={[styles.signalCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
          <Text style={[styles.signalTitle, { color: theme.text }]}>Money Momentum: {trends.momentumLabel}</Text>
          {trends.momentumDrivers.map((driver) => (
            <Text key={driver} style={[styles.signalText, { color: theme.icon }]}>• {driver}</Text>
          ))}
        </View>

        <View style={[styles.signalCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
          <Text style={[styles.signalTitle, { color: theme.text }]}>Goal Momentum</Text>
          {trends.goalMomentum.length ? trends.goalMomentum.map((goal) => (
            <View key={goal.id} style={[styles.goalRow, { borderColor: theme.border }]}> 
              <View style={{ flex: 1 }}>
                <Text style={[styles.goalTitle, { color: theme.text }]}>{goal.title}</Text>
                <Text style={[styles.signalText, { color: theme.icon }]}>Progress: {Math.round(goal.progressPercent)}%</Text>
                <Text style={[styles.signalText, { color: theme.icon }]}>ETA: {goal.etaMonths === null ? 'Needs savings data' : `${goal.etaMonths} months`}</Text>
              </View>
              <Text style={[styles.goalStatus, { color: goal.status === 'Ahead' ? theme.income : goal.status === 'Behind' ? theme.expense : theme.tint }]}>
                {goal.status}
              </Text>
            </View>
          )) : (
            <Text style={[styles.signalText, { color: theme.icon }]}>No active goals. Add a goal to track progress momentum.</Text>
          )}
        </View>

        <View style={[styles.signalCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
          <Text style={[styles.signalTitle, { color: theme.text }]}>Financial Runway Trend</Text>
          <Text style={[styles.signalText, { color: theme.icon }]}>Runway: {trends.runwayMonths.toFixed(1)} months ({trends.runwayMonths >= trends.priorRunwayMonths ? 'up' : 'down'} from {trends.priorRunwayMonths.toFixed(1)} months last quarter).</Text>
        </View>

        <PredictiveBalanceChart
          actualData={trends.actualSeries}
          projectedData={trends.projectedSeries}
          summaryLabel="Month-End"
          summaryValue={formatCurrency(trends.predictedEndBalance)}
        />

        <View style={[styles.signalCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
          <View style={styles.rowBetween}>
            <Text style={[styles.signalTitle, { color: theme.text }]}>AI Insights</Text>
            <Text style={[styles.aiSource, { color: theme.icon }]}>{aiSource === 'online' ? 'Live' : 'Offline Cache'}</Text>
          </View>
          {(aiInsights.length ? aiInsights : trends.fallbackInsights.slice(0, 2)).map((insight) => (
            <Text key={insight} style={[styles.signalText, { color: theme.icon }]}>• {insight}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  primaryCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 220,
  },
  scoreBadge: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 82,
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  miniListCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
  },
  miniListTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  miniListItem: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4,
  },
  signalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  signalTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  signalValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 3,
  },
  signalText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },
  driftValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  goalRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  goalStatus: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  aiSource: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
