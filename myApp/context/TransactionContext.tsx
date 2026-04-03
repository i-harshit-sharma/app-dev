import { addTransaction as addTxToDB, deleteTransaction as deleteTxFromDB, getTransactions as fetchTransactions, initDatabase, updateTransaction as updateTxInDB, exportAllTransactions, importAllTransactions, exportTransactionsAsCSV, importTransactionsFromCSV } from '@/services/DatabaseService';
import { useAuth } from '@/context/AuthContext';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

export type TransactionType = 'expense' | 'income';

export interface TransactionItem {
    id: string;
    title: string;
    subtitle: string;
    amount: number;
    currency: string;
    type: TransactionType;
    icon: string;
    color: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    time: string;
    category: string;
    paymentMethod: string;
    note?: string;
    image?: string;
}

export interface TransactionGroup {
    id: string;
    date: Date;
    items: TransactionItem[];
}

export interface FinancialSummary {
    income: number;
    expense: number;
    balance: number;
    expensesByMethod: Record<string, number>;
}

export interface FinancialPlan {
    monthlyIncome: number;
    monthlyBudget: number;
    fixedObligations: {
        emi: number;
        rentAndUtilities: number;
        otherFixed: number;
    };
    savingsInvestments: {
        sip: number;
        mutualFunds: number;
        otherSavings: number;
    };
}

export interface FinancialHealthSnapshot {
    score: number;
    savingsRatio: number;
    fixedExpenseBurden: number;
    budgetAdherence: number;
    effectiveIncomeToSavingsRatio: number;
}

export interface SafeToSpendSnapshot {
    safeToSpendToday: number;
    remainingMonthlyBudget: number;
    weeklyBudget: number;
    spentThisMonth: number;
    daysLeftInMonth: number;
}

export interface LongTermGoal {
    id: string;
    title: string;
    targetAmount: number;
    targetDate: string;
    currentSaved: number;
    createdAt: string;
}

export interface GoalPlanSnapshot {
    progressPercent: number;
    remainingAmount: number;
    monthsLeft: number;
    requiredMonthlySaving: number;
}

interface TransactionContextType {
    transactions: TransactionGroup[];
    netWorth: number;
    addTransaction: (transaction: Omit<TransactionItem, 'id'> & { date: Date }) => Promise<void>;
    updateTransaction: (itemId: string, transaction: Omit<TransactionItem, 'id'> & { date: Date }) => Promise<void>;
    deleteTransaction: (itemId: string) => Promise<void>;
    setNetWorth: (value: number) => Promise<boolean>;
    financialPlan: FinancialPlan;
    updateFinancialPlan: (partialPlan: Partial<FinancialPlan>) => Promise<boolean>;
    getMonthlySummary: (date: Date) => FinancialSummary;
    getOverallSummary: () => FinancialSummary;
    getWeeklyBudgetAllocation: (date?: Date) => number;
    getFinancialHealth: (date?: Date) => FinancialHealthSnapshot;
    getSafeToSpend: (date?: Date) => SafeToSpendSnapshot;
    goals: LongTermGoal[];
    addGoal: (goal: Omit<LongTermGoal, 'id' | 'createdAt'>) => Promise<boolean>;
    updateGoal: (goalId: string, partial: Partial<Omit<LongTermGoal, 'id' | 'createdAt'>>) => Promise<boolean>;
    deleteGoal: (goalId: string) => Promise<boolean>;
    getGoalPlan: (goalId: string, date?: Date) => GoalPlanSnapshot | null;
    refreshTransactions: () => Promise<void>;
    exportData: () => Promise<string | null>;
    importData: (jsonStr: string) => Promise<boolean>;
    exportDataAsCSV: () => Promise<string | null>;
    importDataFromCSV: (csvStr: string) => Promise<{ imported: number; skipped: number } | null>;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

const getNetWorthKey = (userId: string) => `netWorth_${userId}`;
const getFinancialPlanKey = (userId: string) => `financialPlan_${userId}`;
const getGoalsKey = (userId: string) => `goals_${userId}`;

const DEFAULT_FINANCIAL_PLAN: FinancialPlan = {
    monthlyIncome: 0,
    monthlyBudget: 0,
    fixedObligations: {
        emi: 0,
        rentAndUtilities: 0,
        otherFixed: 0,
    },
    savingsInvestments: {
        sip: 0,
        mutualFunds: 0,
        otherSavings: 0,
    },
};

function sanitizeNumber(value: unknown): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
}

function sanitizePlan(plan?: Partial<FinancialPlan> | null): FinancialPlan {
    if (!plan) return DEFAULT_FINANCIAL_PLAN;
    return {
        monthlyIncome: sanitizeNumber(plan.monthlyIncome),
        monthlyBudget: sanitizeNumber(plan.monthlyBudget),
        fixedObligations: {
            emi: sanitizeNumber(plan.fixedObligations?.emi),
            rentAndUtilities: sanitizeNumber(plan.fixedObligations?.rentAndUtilities),
            otherFixed: sanitizeNumber(plan.fixedObligations?.otherFixed),
        },
        savingsInvestments: {
            sip: sanitizeNumber(plan.savingsInvestments?.sip),
            mutualFunds: sanitizeNumber(plan.savingsInvestments?.mutualFunds),
            otherSavings: sanitizeNumber(plan.savingsInvestments?.otherSavings),
        },
    };
}

function getMonthExpense(groups: TransactionGroup[], date: Date) {
    const month = date.getMonth();
    const year = date.getFullYear();
    return groups
        .filter(group => group.date.getMonth() === month && group.date.getFullYear() === year)
        .flatMap(group => group.items)
        .filter(item => item.type === 'expense')
        .reduce((sum, item) => sum + Math.abs(item.amount), 0);
}

function computeSummary(groups: TransactionGroup[]): FinancialSummary {
    let income = 0;
    let expense = 0;
    const expensesByMethod: Record<string, number> = {};

    groups.forEach(group => {
        group.items.forEach(item => {
            if (item.type === 'expense') {
                expense += item.amount;
                const method = item.paymentMethod || 'Others';
                expensesByMethod[method] = (expensesByMethod[method] || 0) + item.amount;
            } else {
                income += item.amount;
            }
        });
    });

    return {
        income,
        expense,
        balance: income - expense,
        expensesByMethod,
    };
}

export function TransactionProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<TransactionGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [netWorth, setNetWorthState] = useState<number>(0);
    const [financialPlan, setFinancialPlan] = useState<FinancialPlan>(DEFAULT_FINANCIAL_PLAN);
    const [goals, setGoals] = useState<LongTermGoal[]>([]);

    const refreshTransactions = useCallback(async () => {
        console.log("[TransactionContext] Refreshing transactions for user:", user?.id);
        if (!user?.id) {
            setTransactions([]);
            return;
        }

        try {
            const data = await fetchTransactions(user.id);
            console.log(`[TransactionContext] Fetched ${data.length} transaction groups`);
            setTransactions(data);
        } catch (error) {
            console.error("[TransactionContext] Error fetching transactions:", error);
        }
    }, [user?.id]);

    useEffect(() => {
        const loadData = async () => {
            console.log("[TransactionContext] Initializing database and loading data");
            setIsLoading(true);
            try {
                await initDatabase();
                console.log("[TransactionContext] Database initialized");
                if (!user?.id) {
                    console.log("[TransactionContext] No user found, clearing data");
                    setTransactions([]);
                    setNetWorthState(0);
                    return;
                }

                const savedNetWorth = await SecureStore.getItemAsync(getNetWorthKey(user.id));
                if (savedNetWorth !== null) {
                    const parsed = Number(savedNetWorth);
                    setNetWorthState(!Number.isNaN(parsed) && parsed >= 0 ? parsed : 0);
                } else {
                    setNetWorthState(0);
                }

                const savedPlan = await SecureStore.getItemAsync(getFinancialPlanKey(user.id));
                if (savedPlan) {
                    try {
                        setFinancialPlan(sanitizePlan(JSON.parse(savedPlan)));
                    } catch {
                        setFinancialPlan(DEFAULT_FINANCIAL_PLAN);
                    }
                } else {
                    setFinancialPlan(DEFAULT_FINANCIAL_PLAN);
                }

                const savedGoals = await SecureStore.getItemAsync(getGoalsKey(user.id));
                if (savedGoals) {
                    try {
                        const parsed = JSON.parse(savedGoals) as LongTermGoal[];
                        setGoals(Array.isArray(parsed) ? parsed : []);
                    } catch {
                        setGoals([]);
                    }
                } else {
                    setGoals([]);
                }

                await refreshTransactions();
            } catch (error) {
                console.error("Failed to initialize database", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [refreshTransactions, user?.id]);

    const addTransaction = useCallback(async (newTransaction: Omit<TransactionItem, 'id'> & { date: Date }) => {
        console.log("[TransactionContext] Adding transaction:", newTransaction.title);
        if (!user?.id) {
            console.error('Cannot add transaction without an authenticated user');
            return;
        }

        try {
            await addTxToDB(newTransaction, user.id);
            console.log("[TransactionContext] Successfully added transaction");
            await refreshTransactions();
        } catch (error) {
            console.error("Failed to add transaction", error);
        }
    }, [refreshTransactions, user?.id]);

    const deleteTransaction = useCallback(async (itemId: string) => {
        console.log("[TransactionContext] Deleting transaction:", itemId);
        if (!user?.id) {
            console.error('Cannot delete transaction without an authenticated user');
            return;
        }

        try {
            await deleteTxFromDB(itemId, user.id);
            console.log("[TransactionContext] Successfully deleted transaction");
            await refreshTransactions();
        } catch (error) {
            console.error('Failed to delete transaction', error);
        }
    }, [refreshTransactions, user?.id]);

    const updateTransaction = useCallback(async (itemId: string, updatedTransaction: Omit<TransactionItem, 'id'> & { date: Date }) => {
        console.log("[TransactionContext] Updating transaction:", itemId, updatedTransaction.title);
        if (!user?.id) {
            console.error('Cannot update transaction without an authenticated user');
            return;
        }

        try {
            await updateTxInDB(itemId, updatedTransaction, user.id);
            console.log("[TransactionContext] Successfully updated transaction");
            await refreshTransactions();
        } catch (error) {
            console.error('Failed to update transaction', error);
        }
    }, [refreshTransactions, user?.id]);

    const setNetWorth = useCallback(async (value: number) => {
        console.log("[TransactionContext] Setting net worth:", value);
        if (!user?.id) {
            setNetWorthState(0);
            return false;
        }

        setNetWorthState(value);
        try {
            await SecureStore.setItemAsync(getNetWorthKey(user.id), String(value));
            return true;
        } catch (error) {
            console.error("[TransactionContext] Failed to save net worth:", error);
            return false;
        }
    }, [user?.id]);

    const updateFinancialPlan = useCallback(async (partialPlan: Partial<FinancialPlan>) => {
        console.log("[TransactionContext] Updating financial plan");
        if (!user?.id) {
            setFinancialPlan(DEFAULT_FINANCIAL_PLAN);
            return false;
        }

        const merged = sanitizePlan({
            ...financialPlan,
            ...partialPlan,
            fixedObligations: {
                ...financialPlan.fixedObligations,
                ...partialPlan.fixedObligations,
            },
            savingsInvestments: {
                ...financialPlan.savingsInvestments,
                ...partialPlan.savingsInvestments,
            },
        });

        setFinancialPlan(merged);
        try {
            await SecureStore.setItemAsync(getFinancialPlanKey(user.id), JSON.stringify(merged));
            console.log("[TransactionContext] Successfully updated financial plan");
            return true;
        } catch (error) {
            console.error("[TransactionContext] Failed to save financial plan:", error);
            return false;
        }
    }, [financialPlan, user?.id]);

    const getMonthlySummary = useCallback((date: Date) => {
        const month = date.getMonth();
        const year = date.getFullYear();
        const monthlyGroups = transactions.filter(group => group.date.getMonth() === month && group.date.getFullYear() === year);
        const summary = computeSummary(monthlyGroups);

        const now = new Date();
        const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();
        if (isCurrentMonth && financialPlan.monthlyIncome > 0) {
            summary.income += financialPlan.monthlyIncome;
            summary.balance = summary.income - summary.expense;
        }

        return summary;
    }, [financialPlan.monthlyIncome, transactions]);

    const getOverallSummary = useCallback(() => {
        const summary = computeSummary(transactions);
        if (financialPlan.monthlyIncome > 0) {
            summary.income += financialPlan.monthlyIncome;
            summary.balance = summary.income - summary.expense;
        }
        return summary;
    }, [financialPlan.monthlyIncome, transactions]);

    const getWeeklyBudgetAllocation = useCallback((date: Date = new Date()) => {
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        const dailyBudget = financialPlan.monthlyBudget > 0 ? financialPlan.monthlyBudget / daysInMonth : 0;
        return dailyBudget * 7;
    }, [financialPlan.monthlyBudget]);

    const getFinancialHealth = useCallback((date: Date = new Date()): FinancialHealthSnapshot => {
        const fixedTotal = financialPlan.fixedObligations.emi + financialPlan.fixedObligations.rentAndUtilities + financialPlan.fixedObligations.otherFixed;
        const savingsTotal = financialPlan.savingsInvestments.sip + financialPlan.savingsInvestments.mutualFunds + financialPlan.savingsInvestments.otherSavings;
        const effectiveIncome = Math.max(0, financialPlan.monthlyIncome - fixedTotal);
        const spentThisMonth = getMonthExpense(transactions, date);

        const savingsRatio = effectiveIncome > 0 ? Math.min(100, (savingsTotal / effectiveIncome) * 100) : 0;
        const fixedExpenseBurden = financialPlan.monthlyIncome > 0 ? Math.min(100, (fixedTotal / financialPlan.monthlyIncome) * 100) : 0;
        const budgetAdherence = financialPlan.monthlyBudget > 0
            ? Math.max(0, Math.min(100, (1 - Math.max(0, spentThisMonth - financialPlan.monthlyBudget) / financialPlan.monthlyBudget) * 100))
            : 0;

        const score = Math.max(0, Math.min(100,
            (savingsRatio * 0.4) +
            ((100 - fixedExpenseBurden) * 0.3) +
            (budgetAdherence * 0.3)
        ));

        const effectiveIncomeToSavingsRatio = savingsTotal > 0 ? effectiveIncome / savingsTotal : 0;

        return {
            score,
            savingsRatio,
            fixedExpenseBurden,
            budgetAdherence,
            effectiveIncomeToSavingsRatio,
        };
    }, [financialPlan, transactions]);

    const getSafeToSpend = useCallback((date: Date = new Date()): SafeToSpendSnapshot => {
        const spentThisMonth = getMonthExpense(transactions, date);
        const remainingMonthlyBudget = Math.max(0, financialPlan.monthlyBudget - spentThisMonth);

        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        const dayOfMonth = date.getDate();
        const daysLeftInMonth = Math.max(1, daysInMonth - dayOfMonth + 1);
        const elapsedRatio = Math.min(1, dayOfMonth / daysInMonth);

        const expectedSpentByNow = financialPlan.monthlyBudget * elapsedRatio;
        const pacingBonus = Math.max(0, expectedSpentByNow - spentThisMonth) * 0.35;

        const safeToSpendToday = Math.max(0, (remainingMonthlyBudget + pacingBonus) / daysLeftInMonth);

        return {
            safeToSpendToday,
            remainingMonthlyBudget,
            weeklyBudget: getWeeklyBudgetAllocation(date),
            spentThisMonth,
            daysLeftInMonth,
        };
    }, [financialPlan.monthlyBudget, getWeeklyBudgetAllocation, transactions]);

    const persistGoals = useCallback(async (nextGoals: LongTermGoal[]) => {
        if (!user?.id) return false;
        try {
            await SecureStore.setItemAsync(getGoalsKey(user.id), JSON.stringify(nextGoals));
            return true;
        } catch {
            return false;
        }
    }, [user?.id]);

    const addGoal = useCallback(async (goal: Omit<LongTermGoal, 'id' | 'createdAt'>) => {
        const nextGoal: LongTermGoal = {
            ...goal,
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            createdAt: new Date().toISOString(),
        };
        const nextGoals = [nextGoal, ...goals];
        setGoals(nextGoals);
        return persistGoals(nextGoals);
    }, [goals, persistGoals]);

    const updateGoal = useCallback(async (goalId: string, partial: Partial<Omit<LongTermGoal, 'id' | 'createdAt'>>) => {
        const nextGoals = goals.map(goal => goal.id === goalId
            ? {
                ...goal,
                ...partial,
                targetAmount: partial.targetAmount !== undefined ? Math.max(0, partial.targetAmount) : goal.targetAmount,
                currentSaved: partial.currentSaved !== undefined ? Math.max(0, partial.currentSaved) : goal.currentSaved,
            }
            : goal);
        setGoals(nextGoals);
        return persistGoals(nextGoals);
    }, [goals, persistGoals]);

    const deleteGoal = useCallback(async (goalId: string) => {
        const nextGoals = goals.filter(goal => goal.id !== goalId);
        setGoals(nextGoals);
        return persistGoals(nextGoals);
    }, [goals, persistGoals]);

    const getGoalPlan = useCallback((goalId: string, date: Date = new Date()): GoalPlanSnapshot | null => {
        const goal = goals.find(g => g.id === goalId);
        if (!goal) return null;

        const target = Math.max(0, goal.targetAmount);
        const saved = Math.max(0, goal.currentSaved);
        const remainingAmount = Math.max(0, target - saved);
        const progressPercent = target > 0 ? Math.min(100, (saved / target) * 100) : 0;

        const targetDate = new Date(goal.targetDate);
        const monthsLeftRaw = (targetDate.getFullYear() - date.getFullYear()) * 12 + (targetDate.getMonth() - date.getMonth()) + 1;
        const monthsLeft = Math.max(1, monthsLeftRaw);
        const requiredMonthlySaving = remainingAmount / monthsLeft;

        return {
            progressPercent,
            remainingAmount,
            monthsLeft,
            requiredMonthlySaving,
        };
    }, [goals]);

    const exportData = useCallback(async () => {
        if (!user?.id) return null;
        try {
            const dbTransactions = await exportAllTransactions(user.id);
            const data = {
                transactions: dbTransactions,
                financialPlan,
                goals,
                netWorth,
            };
            return JSON.stringify(data);
        } catch (error) {
            console.error("Failed to export data", error);
            return null;
        }
    }, [user?.id, financialPlan, goals, netWorth]);

    const exportDataAsCSV = useCallback(async () => {
        if (!user?.id) return null;
        try {
            const csv = await exportTransactionsAsCSV(user.id);
            return csv || null;
        } catch (error) {
            console.error('Failed to export data as CSV', error);
            return null;
        }
    }, [user?.id]);

    const importDataFromCSV = useCallback(async (csvStr: string) => {
        if (!user?.id) return null;
        try {
            const result = await importTransactionsFromCSV(csvStr, user.id);
            await refreshTransactions();
            return result;
        } catch (error) {
            console.error('Failed to import data from CSV', error);
            return null;
        }
    }, [user?.id, refreshTransactions]);

    const importData = useCallback(async (jsonStr: string) => {
        if (!user?.id) return false;
        try {
            const data = JSON.parse(jsonStr);
            if (data.transactions && Array.isArray(data.transactions)) {
                await importAllTransactions(data.transactions, user.id);
            }
            if (data.financialPlan) {
                await updateFinancialPlan(data.financialPlan);
            }
            if (data.goals && Array.isArray(data.goals)) {
                await persistGoals(data.goals);
                setGoals(data.goals);
            }
            if (data.netWorth !== undefined) {
                await setNetWorth(Number(data.netWorth));
            }
            await refreshTransactions();
            return true;
        } catch (error) {
            console.error("Failed to import data", error);
            return false;
        }
    }, [user?.id, updateFinancialPlan, persistGoals, setNetWorth, refreshTransactions]);

    return (
        <TransactionContext.Provider
            value={{
                transactions,
                netWorth,
                addTransaction,
                updateTransaction,
                deleteTransaction,
                setNetWorth,
                financialPlan,
                updateFinancialPlan,
                getMonthlySummary,
                getOverallSummary,
                getWeeklyBudgetAllocation,
                getFinancialHealth,
                getSafeToSpend,
                goals,
                addGoal,
                updateGoal,
                deleteGoal,
                getGoalPlan,
                refreshTransactions,
                exportData,
                importData,
                exportDataAsCSV,
                importDataFromCSV,
            }}
        >
            {children}
        </TransactionContext.Provider>
    );
}

export function useTransactions() {
    const context = useContext(TransactionContext);
    if (context === undefined) {
        throw new Error('useTransactions must be used within a TransactionProvider');
    }
    return context;
}