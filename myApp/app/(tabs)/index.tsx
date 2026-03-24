import FinancialHealthCard from '@/components/home/FinancialHealthCard';
import InsightCard from '@/components/home/InsightCard';
import PendingTransactionCard from '@/components/home/PendingTransactionCard';
import TransactionItem from '@/components/home/TransactionItem';
// import SearchBar from '@/components/SearchBar'; // Removed SearchBar as per request
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { useTheme } from '@/context/ThemeContext';
import { useTransactions } from '@/context/TransactionContext';
import { InsightFeedService } from '@/services/InsightFeedService';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, Modal, SafeAreaView, SectionList, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const { user } = useAuth();
  const { transactions: expenses, refreshTransactions, addTransaction, financialPlan, getMonthlySummary, getOverallSummary, getFinancialHealth, getSafeToSpend, goals, addGoal, getGoalPlan } = useTransactions();
  const { pendingTransactions, confirmTransaction, dismissTransaction } = useNotifications();
  const { theme: currentTheme } = useTheme();
  const theme = Colors[currentTheme];
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [goalCurrentSaved, setGoalCurrentSaved] = useState('');
  const [goalYears, setGoalYears] = useState('2');
  const [homeAiTip, setHomeAiTip] = useState<string>('');
  // const [searchQuery, setSearchQuery] = useState(''); // Removed search state
  // const [searchInputRef, setSearchInputRef] = useState<TextInput | null>(null); // Removed search ref

  useFocusEffect(
    useCallback(() => {
      refreshTransactions();
    }, [refreshTransactions])
  );

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('generate_insight', () => {
      reloadInsights();
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  // Month-filtered transactions used for default home view.
  const monthFilteredData = useMemo(() => {
    const targetMonth = currentDate.getMonth();
    const targetYear = currentDate.getFullYear();

    return expenses.filter(group => {
      const groupDate = group.date;
      return groupDate.getMonth() === targetMonth && groupDate.getFullYear() === targetYear;
    })
      .map(group => ({ ...group, data: group.items })) // Map items to data for SectionList
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [currentDate, expenses]);

  const transactionSections = monthFilteredData; // Since search is removed, always show month filtered data


  // Calculate Summary & Trends from shared context
  const { summary, trends, expensesByMethod, aiTip } = useMemo(() => {
    const currentSummary = getMonthlySummary(currentDate);
    const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const prevSummary = getMonthlySummary(prevDate);
    const overallSummary = getOverallSummary();
    const currentMonthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const currentExpense = Math.abs(currentSummary.expense);
    const currentIncome = Math.abs(currentSummary.income);
    const previousExpense = Math.abs(prevSummary.expense);
    const previousIncome = Math.abs(prevSummary.income);

    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const safeToSpendSnapshot = getSafeToSpend(currentDate);
    const health = getFinancialHealth(currentDate);
    const savingsRate = currentIncome > 0 ? ((currentIncome - currentExpense) / currentIncome) * 100 : 0;

    let tip = 'Add a few transactions to unlock personalized insights.';
    if (currentIncome === 0 && currentExpense === 0) {
      tip = `No transactions in ${currentMonthLabel}. Add income and expenses to see smarter insights.`;
    } else if (safeToSpendSnapshot.remainingMonthlyBudget >= 0) {
      tip = `Great month so far. Total spent is ₹${Math.round(currentExpense).toLocaleString('en-IN')} and remaining budget is ₹${Math.round(safeToSpendSnapshot.remainingMonthlyBudget).toLocaleString('en-IN')}.`;
    } else {
      tip = `You are over budget this month. Try trimming top categories and align spending pace for the remaining days.`;
    }

    if (Math.abs(overallSummary.expense) > Math.abs(overallSummary.income)) {
      tip = `${tip} Overall spending is higher than income. Consider adjusting budgets.`;
    } else if (savingsRate > 20) {
      tip = `${tip} Strong savings rate (${Math.round(savingsRate)}%). Keep it up.`;
    }

    return {
      summary: {
        expense: currentExpense,
        income: currentIncome,
        total: currentIncome - currentExpense,
      },
      trends: {
        income: calculateTrend(currentIncome, previousIncome),
        expense: calculateTrend(currentExpense, previousExpense),
      },
      expensesByMethod: currentSummary.expensesByMethod,
      aiTip: `${tip} Financial health score: ${Math.round(health.score)}/100. Safe-to-spend today: ₹${Math.round(safeToSpendSnapshot.safeToSpendToday).toLocaleString('en-IN')}.`,
    };
  }, [currentDate, getFinancialHealth, getMonthlySummary, getOverallSummary, getSafeToSpend]);

  // Income/expense snapshot for chart.
  const syncedTotalSpent = summary.expense;
  const syncedTotalIncome = Math.max(summary.income, financialPlan.monthlyIncome);

  const formattedMonth = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const primaryGoal = goals[0];
  const primaryGoalPlan = primaryGoal ? getGoalPlan(primaryGoal.id) : null;

  const reloadInsights = useCallback(async () => {
    const fallbackInsights = [
      aiTip,
      `This month net is ₹${Math.round(summary.total).toLocaleString('en-IN')}. Keep daily pace aligned with budget to protect runway.`,
    ];

    const result = await InsightFeedService.getLaunchInsights({
      userId: user?.id,
      contextSummary: [
        `Month: ${formattedMonth}`,
        `Income: ₹${Math.round(summary.income).toLocaleString('en-IN')}`,
        `Expense: ₹${Math.round(summary.expense).toLocaleString('en-IN')}`,
        `Budget: ₹${Math.round(financialPlan.monthlyBudget).toLocaleString('en-IN')}`,
        `Financial health score: ${Math.round(getFinancialHealth(currentDate).score)}`,
        `Safe to spend today: ₹${Math.round(getSafeToSpend(currentDate).safeToSpendToday).toLocaleString('en-IN')}`,
      ].join('\n'),
      fallbackInsights,
      count: 2,
    });

    setHomeAiTip(result.insights.join(' '));
  }, [aiTip, currentDate, financialPlan.monthlyBudget, formattedMonth, getFinancialHealth, getSafeToSpend, summary.expense, summary.income, summary.total, user?.id]);

  useEffect(() => {
    reloadInsights();
  }, [reloadInsights]);

  const handleSaveGoal = async () => {
    const targetAmount = Number(goalTargetAmount.replace(/,/g, '').trim());
    const currentSaved = Number(goalCurrentSaved.replace(/,/g, '').trim()) || 0;
    const years = Number(goalYears) || 1;

    if (!goalTitle.trim() || !Number.isFinite(targetAmount) || targetAmount <= 0) {
      return;
    }

    const targetDate = new Date();
    targetDate.setFullYear(targetDate.getFullYear() + Math.max(1, years));

    await addGoal({
      title: goalTitle.trim(),
      targetAmount,
      targetDate: targetDate.toISOString(),
      currentSaved: Math.max(0, currentSaved),
    });

    setGoalTitle('');
    setGoalTargetAmount('');
    setGoalCurrentSaved('');
    setGoalYears('2');
    setGoalModalVisible(false);
  };

  const renderSectionHeader = ({ section: { date } }: any) => (
    <View style={[styles.sectionHeaderContainer, { backgroundColor: theme.background }]}>
      <Text style={[styles.sectionHeaderText, { color: theme.icon }]}>
        {date.toLocaleDateString('default', { month: 'short', day: '2-digit', weekday: 'short' }).toUpperCase()}
      </Text>
      <View style={[styles.sectionDivider, { backgroundColor: theme.border }]} />
    </View>
  );

  return (
    <>
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
      <StatusBar barStyle={currentTheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* SearchBar removed as per request */}



      {/* Date Header */}
      <View style={styles.header}>
          <TouchableOpacity onPress={handlePrevMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>

          <Text style={[styles.monthText, { color: theme.text }]}>{formattedMonth}</Text>

          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleNextMonth} style={{ marginRight: 16 }}>
              <Ionicons name="chevron-forward" size={24} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity>
              {/* Notification or specific profile action could go here if removing filter */}
              <Ionicons name="notifications-outline" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

      <SectionList
        sections={transactionSections as any}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionItem
            item={item}
            onAskAI={() => console.log('Ask AI about:', item.title)}
          />
        )}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={(
          <View>
            {/* Pending Transactions from Notifications */}
            {pendingTransactions.map(pt => (
              <PendingTransactionCard
                key={pt.id}
                transaction={pt}
                onConfirm={async () => {
                  await addTransaction({
                    title: pt.title,
                    subtitle: pt.category || 'Notification',
                    amount: pt.amount,
                    currency: 'INR',
                    type: pt.type,
                    category: pt.category || 'Others',
                    paymentMethod: 'Other',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    date: pt.date || new Date(),
                    icon: pt.type === 'income' ? 'cash' : 'cart',
                    color: pt.type === 'income' ? '#4CAF50' : '#f44336',
                    note: pt.originalText,
                  });
                  confirmTransaction(pt.id);
                }}
                onIgnore={() => dismissTransaction(pt.id)}
              />
            ))}

            {/* Financial Health Card */}
            <FinancialHealthCard
              income={syncedTotalIncome}
              expense={syncedTotalSpent}
              incomeTrend={trends.income}
              expenseTrend={trends.expense}
              expensesByMethod={expensesByMethod}
            />

            {/* AI Insight */}
            <InsightCard tip={homeAiTip || aiTip} />

            <View style={[styles.goalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.goalHeaderRow}>
                <Text style={[styles.goalTitle, { color: theme.text }]}>Long-Term Goal</Text>
                <TouchableOpacity onPress={() => setGoalModalVisible(true)}>
                  <Text style={[styles.goalAction, { color: theme.tint }]}>{primaryGoal ? 'Add New' : 'Set Goal'}</Text>
                </TouchableOpacity>
              </View>

              {primaryGoal && primaryGoalPlan ? (
                <>
                  <Text style={[styles.goalName, { color: theme.text }]}>{primaryGoal.title}</Text>
                  <Text style={[styles.goalHint, { color: theme.icon }]}>
                    Save ₹{Math.round(primaryGoalPlan.requiredMonthlySaving).toLocaleString('en-IN')} per month for {primaryGoalPlan.monthsLeft} month(s)
                  </Text>

                  <View style={[styles.goalProgressTrack, { backgroundColor: theme.border }]}>
                    <View style={[styles.goalProgressFill, { backgroundColor: theme.tint, width: `${Math.min(100, primaryGoalPlan.progressPercent)}%` }]} />
                  </View>
                  <Text style={[styles.goalHint, { color: theme.icon }]}>
                    ₹{Math.round(primaryGoal.currentSaved).toLocaleString('en-IN')} saved • {Math.round(primaryGoalPlan.progressPercent)}% complete
                  </Text>
                </>
              ) : (
                <Text style={[styles.goalHint, { color: theme.icon }]}>Set a target like “₹20L car in 2 years” and track monthly savings needed.</Text>
              )}
            </View>



            <View style={{ paddingHorizontal: 20, marginTop: 10, marginBottom: 5 }}>
              <Text style={[styles.feedTitle, { color: theme.text }]}>Transactions</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions for this month</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }} // Space for FAB
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>

      <Modal visible={goalModalVisible} transparent animationType="slide" onRequestClose={() => setGoalModalVisible(false)}>
        <View style={styles.goalModalOverlay}>
          <View style={[styles.goalModalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.goalModalTitle, { color: theme.text }]}>Set Long-Term Goal</Text>
            <TextInput value={goalTitle} onChangeText={setGoalTitle} placeholder="Goal (e.g., Buy car)" placeholderTextColor={theme.icon} style={[styles.goalInput, { color: theme.text, borderColor: theme.border }]} />
            <TextInput value={goalTargetAmount} onChangeText={setGoalTargetAmount} placeholder="Target amount (e.g., 2000000)" placeholderTextColor={theme.icon} keyboardType="numeric" style={[styles.goalInput, { color: theme.text, borderColor: theme.border }]} />
            <TextInput value={goalCurrentSaved} onChangeText={setGoalCurrentSaved} placeholder="Current saved (optional)" placeholderTextColor={theme.icon} keyboardType="numeric" style={[styles.goalInput, { color: theme.text, borderColor: theme.border }]} />
            <TextInput value={goalYears} onChangeText={setGoalYears} placeholder="Years to target" placeholderTextColor={theme.icon} keyboardType="numeric" style={[styles.goalInput, { color: theme.text, borderColor: theme.border }]} />
            <View style={styles.goalModalActions}>
              <TouchableOpacity style={[styles.goalBtn, { borderColor: theme.border }]} onPress={() => setGoalModalVisible(false)}>
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.goalBtn, { backgroundColor: theme.tint, borderColor: theme.tint }]} onPress={handleSaveGoal}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'sans-serif',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginRight: 10,
  },
  sectionDivider: {
    flex: 1,
    height: 1,
  },
  feedTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 5,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
  goalCard: {
    marginHorizontal: 20,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  searchMetaCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  searchMetaTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  searchMetaText: {
    fontSize: 12,
  },
  goalSearchRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  goalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalTitle: { fontSize: 16, fontWeight: '700' },
  goalAction: { fontSize: 13, fontWeight: '700' },
  goalName: { marginTop: 10, fontSize: 15, fontWeight: '600' },
  goalHint: { marginTop: 6, fontSize: 13 },
  goalProgressTrack: { height: 8, borderRadius: 8, marginTop: 10, overflow: 'hidden' },
  goalProgressFill: { height: '100%' },
  goalModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  goalModalCard: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  goalModalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  goalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  goalModalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  goalBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});