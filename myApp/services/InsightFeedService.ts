import * as SecureStore from 'expo-secure-store';

export type InsightSource = 'online' | 'offline';

export interface InsightFeedRequest {
  userId?: string;
  contextSummary: string;
  fallbackInsights: string[];
  count?: number;
}

export interface InsightFeedResult {
  insights: string[];
  source: InsightSource;
}

const DEFAULT_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-flash-lite-latest';
const STORAGE_PREFIX = 'ai_launch_insights_';
const STORAGE_LIMIT = 10;

function uniqueTrimmed(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  items.forEach((item) => {
    const clean = (item || '').trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(clean);
  });

  return out;
}

function pickRandom(items: string[], count: number): string[] {
  const pool = [...items];
  const out: string[] = [];
  while (pool.length > 0 && out.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    out.push(pool[index]);
    pool.splice(index, 1);
  }
  return out;
}

function extractJsonObject(raw: string): string | null {
  const text = (raw || '').trim();
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

async function checkInternet(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch('https://clients3.google.com/generate_204', {
      method: 'GET',
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function readStoredInsights(storageKey: string): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return uniqueTrimmed(parsed.map((item) => String(item)));
  } catch {
    return [];
  }
}

async function writeStoredInsights(storageKey: string, insights: string[]): Promise<void> {
  const compact = uniqueTrimmed(insights).slice(0, STORAGE_LIMIT);
  await SecureStore.setItemAsync(storageKey, JSON.stringify(compact));
}

async function generateFreshInsights(contextSummary: string, count: number): Promise<string[] | null> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = [
    'You are a personal finance signal engine.',
    'Return ONLY valid JSON in this exact format: {"insights":["...", "..."]}',
    `Return ${count} short actionable insights. Each line max 1 sentence.`,
    'Focus on: what changed, why, and what to do next.',
    'Do not include markdown or explanations outside JSON.',
    '',
    '## Financial Context',
    contextSummary,
  ].join('\n');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.45,
        maxOutputTokens: 260,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  let payload: unknown;
  try {
    payload = JSON.parse(rawText);
  } catch {
    const extracted = extractJsonObject(rawText);
    if (!extracted) return null;
    try {
      payload = JSON.parse(extracted);
    } catch {
      return null;
    }
  }

  const insights = Array.isArray((payload as { insights?: unknown[] }).insights)
    ? (payload as { insights: unknown[] }).insights.map((item) => String(item))
    : [];

  const clean = uniqueTrimmed(insights).slice(0, count);
  return clean.length ? clean : null;
}

export const InsightFeedService = {
  async getLaunchInsights(request: InsightFeedRequest): Promise<InsightFeedResult> {
    const count = Math.max(1, Math.min(2, request.count || 2));
    const storageKey = `${STORAGE_PREFIX}${request.userId || 'guest'}`;
    const stored = await readStoredInsights(storageKey);
    const online = await checkInternet();

    if (online) {
      try {
        const fresh = await generateFreshInsights(request.contextSummary, count);
        if (fresh && fresh.length) {
          await writeStoredInsights(storageKey, [...fresh, ...stored]);
          return { insights: fresh, source: 'online' };
        }
      } catch {
        // Fall through to offline.
      }
    }

    const fallbackPool = stored.length ? stored : uniqueTrimmed(request.fallbackInsights);
    const picked = pickRandom(fallbackPool, count);
    const finalInsights = picked.length ? picked : uniqueTrimmed(request.fallbackInsights).slice(0, count);
    return { insights: finalInsights, source: 'offline' };
  },
};
