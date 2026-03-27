import { ShareIntent } from 'expo-share-intent';

export interface ParsedTransaction {
  amount?: number;
  merchant?: string;
  date?: Date;
  type?: 'expense' | 'income';
  category?: string;
  method?: 'GPay' | 'Paytm' | 'PhonePe' | 'Other';
  originalText?: string;
}

export interface AddTransactionDraft {
  amount?: number;
  title: string;
  category: string;
  type: 'expense' | 'income';
  method: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Other';
  date: Date;
  notes: string;
}

function inferCategory(text: string): string {
  const normalized = text.toLowerCase();
  if (/(food|lunch|dinner|breakfast|cafe|coffee|restaurant|swiggy|zomato)/.test(normalized)) return 'Food';
  if (/(grocery|groceries|supermarket|mart|big bazaar|dmart|blinkit|instamart|zepto)/.test(normalized)) return 'Groceries';
  if (/(uber|ola|petrol|fuel|metro|bus|train|transport)/.test(normalized)) return 'Transport';
  if (/(salary|bonus|income|credited|received|payment received)/.test(normalized)) return 'Salary';
  if (/(shopping|amazon|flipkart|mall|purchase)/.test(normalized)) return 'Shopping';
  if (/(bill|electricity|water|internet|recharge)/.test(normalized)) return 'Bills';
  if (/(medicine|hospital|doctor|health)/.test(normalized)) return 'Health';
  return 'Others';
}

function inferType(text: string): 'expense' | 'income' {
  const normalized = text.toLowerCase();

  // Credit/income-first to correctly classify alerts like "Rs 1,00,000 Cr".
  if (/(\bcredited\b|\bcredit\b|\bcr\b|\breceived\b|\bgot\b|\bdeposited\b|\bdeposit\b|\brefund\b|\bsalary\b|\bincome\b|\bearned\b)/i.test(normalized)) {
    return 'income';
  }

  if (/(\bdebited\b|\bdebit\b|\bdr\b|\bpaid\b|\bspent\b|\bsent\b|\bwithdrawn\b|\bwdl\b|\bpurchase\b|\bpurchase\b)/i.test(normalized)) {
    return 'expense';
  }

  return 'expense';
}

function parseAmount(raw: string): number | undefined {
  const cleaned = raw.replace(/,/g, '').replace(/\/-$/g, '').trim();
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

function contextAround(text: string, start: number, end: number): string {
  const left = Math.max(0, start - 48);
  const right = Math.min(text.length, end + 48);
  return text.slice(left, right).toLowerCase();
}

function extractByIntentPatterns(text: string): number | undefined {
  // Intent patterns prefer real transaction verbs and avoid free-form numeric fallback.
  const patterns = [
    /(?:debited|debit|dr\b|paid|spent|sent|withdrawn|wdl)\D{0,25}(?:inr|rs\.?|₹)?\s*\+?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i,
    /(?:credited|credit|cr\b|received|got|deposited|deposit)\D{0,25}(?:inr|rs\.?|₹)?\s*\+?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i,
    /(?:inr|rs\.?|₹)\s*\+?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:\/-)?\s*(?:debited|debit|dr\b|paid|spent|sent|withdrawn|wdl)/i,
    /(?:inr|rs\.?|₹)\s*\+?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:\/-)?\s*(?:credited|credit|cr\b|received|got|deposited|deposit)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = parseAmount(match[1]);
    if (value && value > 0) return value;
  }

  return undefined;
}

function extractCurrencyCandidates(text: string): number | undefined {
  const regex = /(?:₹|inr|rs\.?|rupees?)\s*\+?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)(?:\s*\/-)?/gi;
  const candidates: Array<{ amount: number; score: number }> = [];

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const amount = parseAmount(match[1]);
    if (!amount || amount <= 0) continue;

    const start = match.index;
    const end = match.index + match[0].length;
    const context = contextAround(text, start, end);

    let score = 1;
    if (/(debited|debit|dr\b|paid|spent|sent|withdrawn|wdl|purchase)/i.test(context)) score += 5;
    if (/(credited|credit|cr\b|received|got|deposited|deposit|salary|refund)/i.test(context)) score += 5;

    // Penalize balance-like captures strongly.
    if (/(avl\s*bal|available\s*bal|avbl\s*bal|clr\s*bal|closing\s*bal|\bbal\b|balance)/i.test(context)) score -= 7;

    // Penalize metadata contexts that are frequently not amounts.
    if (/(ref|utr|txn\s*id|transaction\s*id|order#|acct|a\/c|ending|account\s*ending)/i.test(context)) score -= 3;

    candidates.push({ amount, score });
  }

  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => b.score - a.score || b.amount - a.amount);

  return candidates[0].score > 0 ? candidates[0].amount : undefined;
}

function extractBestAmount(text: string): number | undefined {
  const byIntent = extractByIntentPatterns(text);
  if (byIntent) return byIntent;

  const byCurrency = extractCurrencyCandidates(text);
  if (byCurrency) return byCurrency;

  // Conservative fallback: only accept amount near financial verbs.
  const fallback = text.match(/(?:paid|spent|received|credited|debited|dr\b|cr\b|sent|withdrawn)\D{0,20}([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i);
  if (!fallback) return undefined;

  return parseAmount(fallback[1]);
}

function extractVoiceAmount(text: string): number | undefined {
  const normalized = text.toLowerCase();

  const spokenPatterns = [
    /(?:spent|paid|bought|purchase(?:d)?|received|got|earned|credited|deposited)\s*(?:of\s*)?(?:₹|rs\.?|inr|rupees?)?\s*([0-9]+(?:[.,][0-9]{1,2})?)/i,
    /([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:rupees?|rs\.?|inr|₹)/i,
    /(?:amount|total)\s*(?:is|of)?\s*(?:₹|rs\.?|inr|rupees?)?\s*([0-9]+(?:[.,][0-9]{1,2})?)/i,
  ];

  for (const pattern of spokenPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (Number.isFinite(value)) return value;
    }
  }

  return extractBestAmount(text);
}

function normalizeMethod(method?: ParsedTransaction['method']): AddTransactionDraft['method'] {
  if (!method) return 'Other';
  if (method === 'GPay' || method === 'Paytm' || method === 'PhonePe') return 'UPI';
  return 'Other';
}

function extractMerchant(text: string): string | undefined {
  const patterns = [
    /(?:to|at|from)\s+([A-Za-z0-9 &.'-]{2,})/i,
    /merchant\s*:?\s*([A-Za-z0-9 &.'-]{2,})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }

  const firstLine = text.split('\n').map(line => line.trim()).find(Boolean);
  return firstLine || undefined;
}

export const ParserService = {
  parseText: (text: string): ParsedTransaction => {
    let amount: number | undefined;
    let merchant: string | undefined;
    let method: 'GPay' | 'Paytm' | 'PhonePe' | 'Other' = 'Other';

    // Normalize text
    const cleanText = text.trim();

    // Regex Patterns (Simplified for demo, refine with real data)
    
    // Google Pay: "Paid ₹500 to Merchant Name"
    const gpayRegex = /Paid\s+₹?([0-9,.]+)\s+to\s+(.+?)(?:\n|$)/i;
    // Paytm: "Paid Rs. 500 to Merchant Name"
    const paytmRegex = /Paid\s+Rs\.?\s*([0-9,.]+)\s+to\s+(.+?)(?:\s+at|$)/i;
    // PhonePe: "Paid ₹500 to Merchant Name"
    const phonepeRegex = /Paid\s+₹?([0-9,.]+)\s+to\s+(.+?)(?:\n|$)/i;

    let match = cleanText.match(gpayRegex);
    if (match) {
      method = 'GPay';
      amount = parseFloat(match[1].replace(/,/g, ''));
      merchant = match[2].trim();
    } else if ((match = cleanText.match(paytmRegex))) {
      method = 'Paytm';
      amount = parseFloat(match[1].replace(/,/g, ''));
      merchant = match[2].trim();
    } else {
        // Fallback or generic parser if needed
    }

    // Attempt to find any currency-like number if no specific match
    if (!amount) {
        const currencyRegex = /(?:₹|Rs\.?)\s*([0-9,.]+)/i;
        const currencyMatch = cleanText.match(currencyRegex);
        if (currencyMatch) {
            amount = parseFloat(currencyMatch[1].replace(/,/g, ''));
        }
    }

    if (!amount) {
      amount = extractBestAmount(cleanText);
    }

    if (!merchant) {
      merchant = extractMerchant(cleanText);
    }

    return {
      amount,
      merchant: merchant || "Unknown Merchant",
      date: new Date(),
      type: inferType(cleanText),
      category: inferCategory(cleanText),
      method,
      originalText: cleanText,
    };
  },

  parseVoiceCommand: (text: string): ParsedTransaction => {
    const cleanText = text.trim();
    const parsed = ParserService.parseText(cleanText);

    const expenseMatch = cleanText.match(/(?:spent|paid|bought|purchase(?:d)?)\s*(?:₹|rs\.?\s*)?([0-9,.]+)(?:\s+(?:for|on|at|to)\s+(.+))?/i);
    const incomeMatch = cleanText.match(/(?:received|got|earned|salary|income|credited)\s*(?:₹|rs\.?\s*)?([0-9,.]+)(?:\s+(?:from|for)\s+(.+))?/i);

    if (expenseMatch) {
      const amount = extractVoiceAmount(cleanText);
      return {
        ...parsed,
        amount: amount ?? parseFloat(expenseMatch[1].replace(/,/g, '')),
        merchant: expenseMatch[2]?.trim() || parsed.merchant || 'Expense',
        type: 'expense',
        category: inferCategory(expenseMatch[2] || cleanText),
        originalText: cleanText,
      };
    }

    if (incomeMatch) {
      const amount = extractVoiceAmount(cleanText);
      return {
        ...parsed,
        amount: amount ?? parseFloat(incomeMatch[1].replace(/,/g, '')),
        merchant: incomeMatch[2]?.trim() || parsed.merchant || 'Income',
        type: 'income',
        category: inferCategory(incomeMatch[2] || cleanText),
        originalText: cleanText,
      };
    }

    const fallbackAmount = extractVoiceAmount(cleanText);
    return {
      ...parsed,
      amount: fallbackAmount ?? parsed.amount,
      category: parsed.category || inferCategory(cleanText),
      originalText: cleanText,
    };
  },

  buildAddTransactionDraftFromVoice: (text: string): AddTransactionDraft => {
    const parsed = ParserService.parseVoiceCommand(text);

    return {
      amount: parsed.amount,
      title: parsed.merchant || (parsed.type === 'income' ? 'Income' : 'Expense'),
      category: parsed.category || 'Others',
      type: parsed.type || 'expense',
      method: normalizeMethod(parsed.method),
      date: parsed.date || new Date(),
      notes: parsed.originalText || text,
    };
  },

  buildAddTransactionDraftFromText: (text: string): AddTransactionDraft => {
    const parsed = ParserService.parseText(text);

    return {
      amount: parsed.amount,
      title: parsed.merchant || (parsed.type === 'income' ? 'Income' : 'Expense'),
      category: parsed.category || 'Others',
      type: parsed.type || 'expense',
      method: normalizeMethod(parsed.method),
      date: parsed.date || new Date(),
      notes: parsed.originalText || text,
    };
  },

  processShareIntent: async (shareIntent: ShareIntent): Promise<ParsedTransaction | null> => {
     if (shareIntent.type === 'text' || shareIntent.type === 'text/plain') {
         if (shareIntent.value) {
             return ParserService.parseText(shareIntent.value);
         }
     }
     
     // For images/files, we would integrate OCR here. 
     // Returning null for now to indicate "needs more processing" or "not supported yet"
     // dependent on how we handle the flow.
     if (shareIntent.type.startsWith('image')) {
         // TODO: Invoke OCR 
         return null; 
     }

     return null;
  }
};
