import { FinancialPlan, FinancialSummary, LongTermGoal, TransactionGroup, TransactionItem } from '@/context/TransactionContext';

const DEFAULT_GEMINI_MODELS = [
  process.env.EXPO_PUBLIC_GEMINI_MODEL,
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-latest',
].filter((value): value is string => Boolean(value && value.trim()));

export interface ChatAssistantUser {
  name?: string;
}

export interface ChatInsightCard {
  title: string;
  value: string;
  caption: string;
  tone?: 'blue' | 'green' | 'coral';
}

export interface ChatAssistantReply {
  text: string;
  insight?: ChatInsightCard;
  suggestions?: string[];
}

export interface ChatConversationTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface ChatAssistantContext {
  user?: ChatAssistantUser | null;
  netWorth: number;
  financialPlan: FinancialPlan;
  goals: LongTermGoal[];
  transactions: TransactionGroup[];
  monthlySummary: FinancialSummary;
  overallSummary: FinancialSummary;
}

type FlatTransaction = TransactionItem & { date: Date };

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: ['food', 'coffee', 'tea', 'restaurant', 'dining', 'swiggy', 'zomato', 'lunch', 'dinner', 'breakfast'],
  Transport: ['transport', 'uber', 'ola', 'metro', 'fuel', 'petrol', 'travel', 'bus', 'train'],
  Shopping: ['shopping', 'amazon', 'flipkart', 'mall', 'clothes'],
  Bills: ['bill', 'bills', 'electricity', 'water', 'wifi', 'internet', 'recharge'],
  Health: ['health', 'medicine', 'hospital', 'doctor', 'medical'],
  Salary: ['salary', 'income', 'paycheck', 'credited', 'earned'],
  Others: ['other', 'others', 'misc'],
};

function formatCurrency(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `₹${Math.round(safe).toLocaleString('en-IN')}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function flattenTransactions(groups: TransactionGroup[]): FlatTransaction[] {
  return groups.flatMap((group) => group.items.map((item) => ({ ...item, date: group.date })));
}

function daysBetween(start: Date, end: Date): number {
  return Math.max(1, Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / (24 * 60 * 60 * 1000)) + 1);
}

function getCurrentMonthTransactions(items: FlatTransaction[]): FlatTransaction[] {
  const now = new Date();
  return items.filter(
    (item) => item.date.getMonth() === now.getMonth() && item.date.getFullYear() === now.getFullYear()
  );
}

function getLastNDaysTransactions(items: FlatTransaction[], days: number): FlatTransaction[] {
  const end = startOfDay(new Date());
  const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return items.filter((item) => {
    const current = startOfDay(item.date);
    return current >= start && current <= end;
  });
}

function getCategoryMention(query: string): string | undefined {
  const normalized = query.toLowerCase();
  return Object.entries(CATEGORY_KEYWORDS).find(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)))?.[0];
}

function summarizeByCategory(items: FlatTransaction[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    if (item.type === 'expense') {
      const category = item.category || 'Others';
      acc[category] = (acc[category] || 0) + item.amount;
    }
    return acc;
  }, {});
}

function summarizeByMerchant(items: FlatTransaction[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    if (item.type === 'expense') {
      const merchant = item.title || 'Unknown';
      acc[merchant] = (acc[merchant] || 0) + item.amount;
    }
    return acc;
  }, {});
}

function topEntry(record: Record<string, number>): [string, number] | undefined {
  return Object.entries(record).sort((left, right) => right[1] - left[1])[0];
}

function getRunwayDays(netWorth: number, monthlyExpense: number): number | null {
  if (monthlyExpense <= 0) return null;
  const avgDailyExpense = monthlyExpense / 30;
  if (avgDailyExpense <= 0) return null;
  return Math.max(0, Math.floor(netWorth / avgDailyExpense));
}

function getEffectiveMonthlyIncome(context: ChatAssistantContext): number {
  return Math.max(context.monthlySummary.income, context.financialPlan.monthlyIncome || 0);
}

function extractJsonObject(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const direct = trimmed.match(/\{[\s\S]*\}/);
  return direct ? direct[0] : null;
}

function hasNumberSignal(value: string): boolean {
  return /\d/.test(value || '');
}

function sanitizeReply(reply: ChatAssistantReply): ChatAssistantReply {
  const text = (reply.text || '').trim();
  const suggestions = Array.isArray(reply.suggestions)
    ? reply.suggestions
      .map((item) => (item || '').trim())
      .filter(Boolean)
      .slice(0, 3)
    : undefined;

  const insight = reply.insight
    ? {
      title: (reply.insight.title || '').trim(),
      value: (reply.insight.value || '').trim(),
      caption: (reply.insight.caption || '').trim(),
      tone: reply.insight.tone,
    }
    : undefined;

  const meaningfulInsight = insight
    && insight.title
    && insight.value
    && insight.caption
    && (hasNumberSignal(insight.value) || hasNumberSignal(insight.caption));

  return {
    text: text || 'I can help with that. Ask me for spending, savings, goals, or a decision analysis.',
    insight: meaningfulInsight ? insight : undefined,
    suggestions,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MIN_REQUEST_GAP_MS = 1800;
const MAX_REQUESTS_PER_MINUTE = 18;
const REQUEST_WINDOW_MS = 60_000;

let lastRequestAt = 0;
const requestWindow: number[] = [];

async function waitForRateLimitSlot(): Promise<void> {
  const now = Date.now();

  while (requestWindow.length > 0 && now - requestWindow[0] > REQUEST_WINDOW_MS) {
    requestWindow.shift();
  }

  const spacingWait = Math.max(0, MIN_REQUEST_GAP_MS - (now - lastRequestAt));
  const windowWait = requestWindow.length >= MAX_REQUESTS_PER_MINUTE
    ? Math.max(0, REQUEST_WINDOW_MS - (now - requestWindow[0]))
    : 0;

  const waitMs = Math.max(spacingWait, windowWait);
  if (waitMs > 0) {
    console.log('[Gemini][Chat][RateLimit] Waiting ms =>', waitMs);
    await delay(waitMs);
  }

  const mark = Date.now();
  lastRequestAt = mark;
  requestWindow.push(mark);
}

function parseRetryAfterMs(response: Response): number {
  const retryAfter = response.headers.get('retry-after');
  if (!retryAfter) return 0;

  const asSeconds = Number(retryAfter);
  if (Number.isFinite(asSeconds) && asSeconds > 0) {
    return Math.round(asSeconds * 1000);
  }

  const asDate = Date.parse(retryAfter);
  if (Number.isFinite(asDate)) {
    return Math.max(0, asDate - Date.now());
  }
  return 0;
}

function buildOverviewReply(context: ChatAssistantContext): ChatAssistantReply {
  const monthlyExpense = context.monthlySummary.expense;
  const monthlyIncome = getEffectiveMonthlyIncome(context);
  const available = Math.max(0, context.netWorth - monthlyExpense);
  const runwayDays = getRunwayDays(context.netWorth, monthlyExpense);
  const userName = context.user?.name?.split(' ')[0] || 'there';

  return {
    text: `${userName}, this month you have spent ${formatCurrency(monthlyExpense)} and brought in ${formatCurrency(monthlyIncome)}. Based on your current net worth, your available cushion is ${formatCurrency(available)}${runwayDays !== null ? `, which is roughly ${runwayDays} days of runway at your current pace.` : '.'}`,
    insight: {
      title: 'Monthly Snapshot',
      value: formatCurrency(available),
      caption: 'Available after current month spending',
      tone: available > 0 ? 'green' : 'coral',
    },
    suggestions: ['Where am I overspending?', 'What is my top category?', 'Show recent transactions'],
  };
}

function buildCategoryReply(query: string, items: FlatTransaction[]): ChatAssistantReply | null {
  const category = getCategoryMention(query);
  if (!category) return null;

  const currentMonthItems = getCurrentMonthTransactions(items).filter(
    (item) => item.type === 'expense' && (item.category || 'Others').toLowerCase() === category.toLowerCase()
  );
  const total = currentMonthItems.reduce((sum, item) => sum + item.amount, 0);
  const count = currentMonthItems.length;
  const biggest = [...currentMonthItems].sort((left, right) => right.amount - left.amount)[0];

  return {
    text: count > 0
      ? `You spent ${formatCurrency(total)} on ${category.toLowerCase()} this month across ${count} transaction${count === 1 ? '' : 's'}. The biggest one was ${formatCurrency(biggest.amount)} at ${biggest.title}.`
      : `You have no ${category.toLowerCase()} expenses recorded for this month yet.`,
    insight: {
      title: `${category} Spend`,
      value: formatCurrency(total),
      caption: count > 0 ? `${count} transaction${count === 1 ? '' : 's'} this month` : 'No expense entries this month',
      tone: total > 0 ? 'coral' : 'blue',
    },
    suggestions: ['Show recent transactions', 'Where am I overspending?', 'How much did I spend this month?'],
  };
}

function buildOverspendingReply(items: FlatTransaction[]): ChatAssistantReply {
  const monthExpenses = getCurrentMonthTransactions(items).filter((item) => item.type === 'expense');
  const categoryTotals = summarizeByCategory(monthExpenses);
  const [topCategory, topSpend] = topEntry(categoryTotals) || ['No category', 0];
  const totalExpense = Object.values(categoryTotals).reduce((sum, value) => sum + value, 0);
  const share = totalExpense > 0 ? Math.round((topSpend / totalExpense) * 100) : 0;

  return {
    text: topSpend > 0
      ? `${topCategory} is your biggest expense bucket this month at ${formatCurrency(topSpend)}, which is ${share}% of all spending. If you want to reduce one area first, start there.`
      : 'You do not have enough expense data this month for overspending analysis yet.',
    insight: {
      title: 'Top Spending Category',
      value: topCategory,
      caption: topSpend > 0 ? `${formatCurrency(topSpend)} this month` : 'Waiting for more data',
      tone: 'coral',
    },
    suggestions: ['How much did I spend this month?', 'What is my runway?', `How much on ${topCategory.toLowerCase()}?`],
  };
}

function buildRunwayReply(context: ChatAssistantContext): ChatAssistantReply {
  const monthlyExpense = context.monthlySummary.expense;
  const runwayDays = getRunwayDays(context.netWorth, monthlyExpense);
  const available = Math.max(0, context.netWorth - monthlyExpense);

  return {
    text: runwayDays === null
      ? `Your current net worth is ${formatCurrency(context.netWorth)}. I need a bit more spending history before I can estimate runway accurately.`
      : `At your current monthly expense pace of ${formatCurrency(monthlyExpense)}, your net worth gives you about ${runwayDays} days of runway. After this month’s spending, your remaining cushion is ${formatCurrency(available)}.`,
    insight: {
      title: 'Runway',
      value: runwayDays === null ? 'Stable' : `${runwayDays} days`,
      caption: `Net worth ${formatCurrency(context.netWorth)}`,
      tone: runwayDays !== null && runwayDays < 15 ? 'coral' : 'green',
    },
    suggestions: ['How much did I spend this month?', 'Where am I overspending?', 'What is my top category?'],
  };
}

function buildRecentTransactionsReply(items: FlatTransaction[]): ChatAssistantReply {
  const recent = [...items]
    .sort((left, right) => right.date.getTime() - left.date.getTime())
    .slice(0, 3);

  if (recent.length === 0) {
    return {
      text: 'You have no transactions yet. Add a few entries and I can start answering with real insights.',
      suggestions: ['How much did I spend this month?', 'What is my runway?', 'Where am I overspending?'],
    };
  }

  const list = recent
    .map((item) => `${item.type === 'income' ? 'Income' : 'Spent'} ${formatCurrency(item.amount)} for ${item.title}`)
    .join(', ');

  return {
    text: `Your latest activity: ${list}.`,
    insight: {
      title: 'Latest Transaction',
      value: recent[0].title,
      caption: `${formatCurrency(recent[0].amount)} • ${recent[0].category}`,
      tone: recent[0].type === 'income' ? 'green' : 'blue',
    },
    suggestions: ['How much did I spend this month?', 'What is my top category?', 'What is my runway?'],
  };
}

function buildMonthlySpendReply(context: ChatAssistantContext): ChatAssistantReply {
  const expense = context.monthlySummary.expense;
  const income = getEffectiveMonthlyIncome(context);
  const net = income - expense;

  return {
    text: `This month you have spent ${formatCurrency(expense)} and earned ${formatCurrency(income)}. Your net movement for the month is ${net >= 0 ? '+' : '-'}${formatCurrency(Math.abs(net)).replace('₹', '₹')}.`,
    insight: {
      title: 'This Month',
      value: formatCurrency(expense),
      caption: `Income ${formatCurrency(income)}`,
      tone: 'blue',
    },
    suggestions: ['Where am I overspending?', 'What is my runway?', 'Show recent transactions'],
  };
}

function buildSavingsReply(context: ChatAssistantContext): ChatAssistantReply {
  const monthIncome = getEffectiveMonthlyIncome(context);
  const monthExpense = context.monthlySummary.expense;
  const savings = monthIncome - monthExpense;
  const savingsRate = monthIncome > 0 ? Math.round((savings / monthIncome) * 100) : 0;

  return {
    text: `You are currently saving ${formatCurrency(Math.max(0, savings))} this month, which is about ${Math.max(0, savingsRate)}% of your income baseline.`,
    insight: {
      title: 'Savings Rate',
      value: `${Math.max(0, savingsRate)}%`,
      caption: `${formatCurrency(Math.max(0, savings))} saved this month`,
      tone: savings >= 0 ? 'green' : 'coral',
    },
    suggestions: ['How much did I spend this month?', 'Where am I overspending?', 'What is my runway?'],
  };
}

function buildMerchantReply(items: FlatTransaction[]): ChatAssistantReply {
  const merchantTotals = summarizeByMerchant(getCurrentMonthTransactions(items));
  const [topMerchant, topSpend] = topEntry(merchantTotals) || ['No merchant', 0];

  return {
    text: topSpend > 0
      ? `${topMerchant} is your highest-spend merchant this month at ${formatCurrency(topSpend)}.`
      : 'You do not have enough expense data this month to identify a top merchant yet.',
    insight: {
      title: 'Top Merchant',
      value: topMerchant,
      caption: topSpend > 0 ? `${formatCurrency(topSpend)} this month` : 'Waiting for more data',
      tone: 'blue',
    },
    suggestions: ['Where am I overspending?', 'Show recent transactions', 'How much did I spend this month?'],
  };
}

// ─── Gemini integration ───────────────────────────────────────────────────────

function buildFinancialContext(context: ChatAssistantContext): string {
  const items = flattenTransactions(context.transactions);
  const currentMonth = getCurrentMonthTransactions(items);
  const expenses = currentMonth.filter((i) => i.type === 'expense');
  const categoryTotals = summarizeByCategory(expenses);
  const [topCat, topAmount] = topEntry(categoryTotals) || ['None', 0];
  const recent = getLastNDaysTransactions(items, 7)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 20);
  const runwayDays = getRunwayDays(context.netWorth, context.monthlySummary.expense);
  const userName = context.user?.name || 'User';

  const fixedObligations = context.financialPlan.fixedObligations.emi
    + context.financialPlan.fixedObligations.rentAndUtilities
    + context.financialPlan.fixedObligations.otherFixed;
  const savingsInvestments = context.financialPlan.savingsInvestments.sip
    + context.financialPlan.savingsInvestments.mutualFunds
    + context.financialPlan.savingsInvestments.otherSavings;

  const categoryLines = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `  - ${cat}: ${formatCurrency(amt)}`)
    .join('\n');

  const recentLines = recent
    .map((t) => `  - ${t.date.toISOString().slice(0, 10)} | ${t.type === 'income' ? 'Income' : 'Expense'} | ${formatCurrency(t.amount)} | ${t.title} | ${t.category || 'Uncategorized'} | ${t.paymentMethod || 'Unknown'}`)
    .join('\n');

  const goalLines = (context.goals || [])
    .slice(0, 5)
    .map((goal) => {
      const target = Math.max(0, Number(goal.targetAmount) || 0);
      const saved = Math.max(0, Number(goal.currentSaved) || 0);
      const remaining = Math.max(0, target - saved);
      const now = new Date();
      const targetDate = new Date(goal.targetDate);
      const monthsLeftRaw = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth()) + 1;
      const monthsLeft = Math.max(1, monthsLeftRaw);
      const monthlyNeed = remaining / monthsLeft;
      const progress = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
      return `  - ${goal.title}: target ${formatCurrency(target)}, saved ${formatCurrency(saved)}, remaining ${formatCurrency(remaining)}, monthsLeft ${monthsLeft}, requiredMonthlySaving ${formatCurrency(monthlyNeed)}, progress ${Math.round(progress)}%`;
    })
    .join('\n');

  return [
    `User name: ${userName}`,
    `Monthly Income (configured inflow): ${formatCurrency(context.financialPlan.monthlyIncome)}`,
    `Monthly Budget: ${formatCurrency(context.financialPlan.monthlyBudget)}`,
    `Outflows - Fixed obligations total: ${formatCurrency(fixedObligations)} (EMI ${formatCurrency(context.financialPlan.fixedObligations.emi)}, Rent/Utilities ${formatCurrency(context.financialPlan.fixedObligations.rentAndUtilities)}, Other Fixed ${formatCurrency(context.financialPlan.fixedObligations.otherFixed)})`,
    `Outflows - Savings & investments total: ${formatCurrency(savingsInvestments)} (SIP ${formatCurrency(context.financialPlan.savingsInvestments.sip)}, Mutual Funds ${formatCurrency(context.financialPlan.savingsInvestments.mutualFunds)}, Other Savings ${formatCurrency(context.financialPlan.savingsInvestments.otherSavings)})`,
    `This month income: ${formatCurrency(context.monthlySummary.income)}`,
    `This month expenses: ${formatCurrency(context.monthlySummary.expense)}`,
    `Total transactions on record: ${items.length}`,
    `Top spending category: ${topCat} (${formatCurrency(topAmount)})`,
    `Runway at current pace: ${runwayDays !== null ? `${runwayDays} days` : 'Unknown (need more data)'}`,
    '',
    'Long-term goals:',
    goalLines || '  No long-term goals configured',
    '',
    'Category breakdown this month:',
    categoryLines || '  No expense data this month',
    '',
    'Recent transactions (last 7 days, sanitized - no notes):',
    recentLines || '  No transactions yet',
  ].join('\n');
}

function buildConversationContext(history: ChatConversationTurn[]): string {
  if (!history.length) {
    return 'No prior turns in this session.';
  }

  return history
    .slice(-8)
    .map((turn) => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.text.replace(/\s+/g, ' ').trim()}`)
    .join('\n');
}

async function callGeminiApi(userQuery: string, financialContext: string, history: ChatConversationTurn[] = []): Promise<ChatAssistantReply> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY');
  }

  const systemInstruction = [
    'You are FinVault AI, a smart personal finance assistant embedded in a mobile app.',
    "You have the user's real financial data. Always give specific, data-driven answers using exact numbers from the context.",
    'Be concise and friendly but useful: prefer 3-5 sentences for typed questions that ask for decisions or comparisons. Use Indian Rupee (\u20b9) for all currency values.',
    'Give practical recommendations: budget pacing, safe-to-spend guidance, saving actions, and category-specific controls.',
    'Never expose raw internal data blobs. Summarize clearly.',
    'If a question is outside user data (e.g., credit score, loans, tax basics), answer as general personal-finance guidance and do not force monthly app stats unless relevant.',
    'Use prior turns for context. If the user asks follow-ups like "final verdict", continue the same topic and give a clear recommendation, not a reset summary.',
    '',
    'You MUST respond with a valid JSON object with this exact structure:',
    '{',
    '  "text": "Your conversational response (3-5 sentences when needed)",',
    '  "insight": { // optional',
    '    "title": "2-4 word title",',
    '    "value": "The key metric value with number/currency",',
    '    "caption": "Brief one-line caption",',
    '    "tone": "green OR coral OR blue"',
    '  },',
    '  "suggestions": ["Follow-up question 1", "Follow-up question 2", "Follow-up question 3"]',
    '}',
    '',
    'The "insight" field is OPTIONAL. Include it only when there is a clear, high-value metric to highlight. If no strong metric is needed, omit it completely.',
    'Use "green" for positive/income metrics, "coral" for overspending/warnings, "blue" for neutral data.',
  ].join('\n');

  const conversationContext = buildConversationContext(history);
  const fullPrompt = `${systemInstruction}\n\n## User Financial Data\n${financialContext}\n\n## Conversation So Far (latest last)\n${conversationContext}\n\n## User Question\n${userQuery}`;

  console.log('[Gemini][Chat] Prompt =>\n', fullPrompt);
  let lastError: unknown = null;

  for (const model of DEFAULT_GEMINI_MODELS) {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    console.log('[Gemini][Chat] Trying model =>', model);

    try {
      await waitForRateLimitSlot();

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          const waitFromHeader = parseRetryAfterMs(response);
          const backoff = waitFromHeader > 0 ? waitFromHeader : 2200;
          console.warn('[Gemini][Chat][RateLimit] Received 429. Backing off ms =>', backoff);
          await delay(backoff);
        }
        const errText = await response.text();
        throw new Error(`Gemini API ${response.status}: ${errText}`);
      }

      const data = await response.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      console.log('[Gemini][Chat] Response(raw) =>\n', rawText || '(empty)');

      try {
        const parsed = JSON.parse(rawText) as ChatAssistantReply;
        if (parsed?.text) return sanitizeReply(parsed);
      } catch {
        // Try loose extraction + retry below.
      }

      const extracted = extractJsonObject(rawText);
      if (extracted) {
        try {
          const parsed = JSON.parse(extracted) as ChatAssistantReply;
          if (parsed?.text) return sanitizeReply(parsed);
        } catch {
          // Continue to retry.
        }
      }

      // Retry once without responseMimeType constraint.
      await waitForRateLimitSlot();
      const retry = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 600,
          },
        }),
      });
      if (!retry.ok) throw new Error('Gemini retry failed');
      const retryData = await retry.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const retryRaw = retryData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('[Gemini][Chat] Response(raw-retry) =>\n', retryRaw || '(empty)');
      const retryJson = extractJsonObject(retryRaw);
      if (!retryJson) throw new Error('Could not parse Gemini JSON response');
      return sanitizeReply(JSON.parse(retryJson) as ChatAssistantReply);
    } catch (error) {
      lastError = error;
      console.error(`[Gemini][Chat] Model failed: ${model}`, error);
      continue;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('All Gemini models failed');
}

function localRespond(query: string, context: ChatAssistantContext): ChatAssistantReply {
  const normalized = query.trim().toLowerCase();
  const items = flattenTransactions(context.transactions);

  if (!normalized) return buildOverviewReply(context);

  const categoryReply = buildCategoryReply(normalized, items);
  if (categoryReply) return categoryReply;

  if (/(overspend|too much|budget|cut back|reduce)/.test(normalized)) return buildOverspendingReply(items);
  if (/(runway|how long|survive|available|cushion)/.test(normalized)) return buildRunwayReply(context);
  if (/(recent|latest|last transaction|last few)/.test(normalized)) return buildRecentTransactionsReply(items);
  if (/(spend|spent|expense|expenses|month)/.test(normalized)) return buildMonthlySpendReply(context);
  if (/(save|saving|savings)/.test(normalized)) return buildSavingsReply(context);
  if (/(merchant|shop|store)/.test(normalized)) return buildMerchantReply(items);

  if (/(interest rate|apr|credit score|cibil|loan rate|mortgage)/.test(normalized)) {
    return {
      text: 'For a 750 credit score, 7.5% is generally a strong rate in many markets, especially for secured loans. Compare 2-3 lenders, check processing fees, and ensure prepayment terms are favorable before deciding.',
      suggestions: ['How can I improve my score further?', 'How much EMI can I safely afford?', 'Should I prepay or invest surplus?'],
    };
  }

  if (/(income|earned|salary|credited)/.test(normalized)) {
    const income = getEffectiveMonthlyIncome(context);
    return {
      text: `This month your income baseline is ${formatCurrency(income)}. Recorded transaction income is ${formatCurrency(context.monthlySummary.income)}, and total lifetime income entries are ${formatCurrency(context.overallSummary.income)}.`,
      insight: { title: 'Income', value: formatCurrency(income), caption: 'Monthly baseline', tone: 'green' },
      suggestions: ['How much did I spend this month?', 'What is my runway?', 'Show recent transactions'],
    };
  }

  if (/(net worth|worth|balance)/.test(normalized)) {
    return {
      text: `Your current net worth is ${formatCurrency(context.netWorth)}. After this month's recorded spending, your remaining available cushion is ${formatCurrency(Math.max(0, context.netWorth - context.monthlySummary.expense))}.`,
      insight: { title: 'Net Worth', value: formatCurrency(context.netWorth), caption: 'Current profile value', tone: 'blue' },
      suggestions: ['What is my runway?', 'How much did I spend this month?', 'Where am I overspending?'],
    };
  }

  if (/(help|what can you do)/.test(normalized)) {
    return {
      text: 'I can explain your spending, highlight overspending categories, estimate runway, review recent transactions, and summarize monthly income or expenses using your own app data.',
      suggestions: ['How much did I spend this month?', 'Where am I overspending?', 'What is my runway?'],
    };
  }

  return buildOverviewReply(context);
}

// ─── Public service ───────────────────────────────────────────────────────────

export const ChatAssistantService = {
  getWelcomeReply(context: ChatAssistantContext): ChatAssistantReply {
    return buildOverviewReply(context);
  },

  getSuggestedPrompts(context: ChatAssistantContext): string[] {
    const items = flattenTransactions(context.transactions);
    if (items.length === 0) {
      return ['How should I start tracking?', 'What is net worth?', 'How do I stay on budget?'];
    }

    return ['How much did I spend this month?', 'Where am I overspending?', 'What is my runway?', 'Show recent transactions'];
  },

  async respond(query: string, context: ChatAssistantContext, history: ChatConversationTurn[] = []): Promise<ChatAssistantReply> {
    const normalized = query.trim();
    if (!normalized) return buildOverviewReply(context);

    try {
      const financialContext = buildFinancialContext(context);
      return await callGeminiApi(normalized, financialContext, history);
    } catch (_err) {
      // Gemini unavailable - fall back to local pattern matching
      return localRespond(query, context);
    }
  },

  async respondTyped(query: string, context: ChatAssistantContext, history: ChatConversationTurn[] = []): Promise<ChatAssistantReply> {
    const normalized = query.trim();
    if (!normalized) return buildOverviewReply(context);

    try {
      const financialContext = buildFinancialContext(context);
      return await callGeminiApi(normalized, financialContext, history);
    } catch (err) {
      console.error('[Gemini][Chat] Typed request failed:', err);
      return {
        text: 'I could not reach Gemini right now. Please try again in a moment.',
        suggestions: this.getSuggestedPrompts(context),
      };
    }
  },

  respondSuggested(query: string, context: ChatAssistantContext): ChatAssistantReply {
    const normalized = query.trim();
    if (!normalized) return buildOverviewReply(context);
    return localRespond(query, context);
  },
};