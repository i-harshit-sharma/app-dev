import { AddTransactionDraft, ParserService } from './ParserService';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

const MAX_UPLOAD_BYTES = 1024 * 1024;

type MlKitRecognizer = {
    recognize: (uri: string) => Promise<any>;
};

type GeminiTransaction = {
    merchant?: string;
    amount?: number;
    date?: string;
    category?: string;
    items?: Array<{ name?: string; price?: number | null }>;
};

function toDate(dateString?: string): Date {
    if (!dateString) return new Date();
    const parsed = new Date(dateString);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function inferMimeType(uri: string): string {
    const lower = uri.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
}

function getMlKitRecognizer(): MlKitRecognizer | null {
    try {
        const mod = require('@react-native-ml-kit/text-recognition');
        const candidate = mod?.default || mod?.TextRecognition || mod;
        if (candidate && typeof candidate.recognize === 'function') {
            return candidate as MlKitRecognizer;
        }
        return null;
    } catch {
        return null;
    }
}

function extractTextFromMlKitResult(result: any): string {
    if (!result) return '';
    if (typeof result === 'string') return result;
    if (typeof result?.text === 'string') return result.text;
    if (Array.isArray(result?.blocks)) {
        return result.blocks
            .map((b: any) => b?.text || b?.lines?.map((l: any) => l?.text || '').join('\n') || '')
            .filter(Boolean)
            .join('\n');
    }
    return '';
}

function extractContentBox(result: any): { x: number; y: number; width: number; height: number } | null {
    const blocks = Array.isArray(result?.blocks) ? result.blocks : [];
    if (!blocks.length) return null;

    const rects = blocks
        .map((b: any) => b?.frame || b?.boundingBox || b?.bounds)
        .filter((r: any) => r && Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.width) && Number.isFinite(r.height));

    if (!rects.length) return null;

    const minX = Math.min(...rects.map((r: any) => r.x));
    const minY = Math.min(...rects.map((r: any) => r.y));
    const maxX = Math.max(...rects.map((r: any) => r.x + r.width));
    const maxY = Math.max(...rects.map((r: any) => r.y + r.height));

    const margin = 16;
    return {
        x: Math.max(0, Math.floor(minX - margin)),
        y: Math.max(0, Math.floor(minY - margin)),
        width: Math.max(1, Math.floor(maxX - minX + margin * 2)),
        height: Math.max(1, Math.floor(maxY - minY + margin * 2)),
    };
}

async function getFileSize(uri: string): Promise<number> {
    try {
        const info = await FileSystem.getInfoAsync(uri);
        return info.exists && typeof info.size === 'number' ? info.size : 0;
    } catch {
        return 0;
    }
}

async function resizeImageToMaxLimit(uri: string, maxBytes: number = MAX_UPLOAD_BYTES): Promise<string> {
    let currentUri = uri;
    const initialSize = await getFileSize(currentUri);
    if (initialSize > 0 && initialSize <= maxBytes) return currentUri;

    let width = 1600;
    let compress = 0.85;
    let attempts = 0;

    while (attempts < 7) {
        const result = await ImageManipulator.manipulateAsync(
            currentUri,
            [{ resize: { width } }],
            { compress, format: ImageManipulator.SaveFormat.JPEG }
        );

        currentUri = result.uri;
        const size = await getFileSize(currentUri);
        if (size > 0 && size <= maxBytes) {
            return currentUri;
        }

        width = Math.max(640, Math.floor((result.width || width) * 0.85));
        compress = Math.max(0.4, compress - 0.08);
        attempts += 1;
    }

    return currentUri;
}

async function normalizeResolution(uri: string): Promise<string> {
    const info = await ImageManipulator.manipulateAsync(uri, [], { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG });
    const currentWidth = info.width || 0;
    if (currentWidth >= 1024 && currentWidth <= 1600) return uri;

    const targetWidth = currentWidth > 1600 ? 1400 : 1200;
    const resized = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: targetWidth } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    return resized.uri;
}

async function runMlKitWithDeskew(uri: string): Promise<{ text: string; bestUri: string; raw: any }> {
    const recognizer = getMlKitRecognizer();
    if (!recognizer) {
        return { text: '', bestUri: uri, raw: null };
    }

    const angles = [0, -4, -2, 2, 4];
    let bestText = '';
    let bestUri = uri;
    let bestRaw: any = null;

    for (const angle of angles) {
        let candidateUri = uri;
        if (angle !== 0) {
            const rotated = await ImageManipulator.manipulateAsync(
                uri,
                [{ rotate: angle }],
                { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
            );
            candidateUri = rotated.uri;
        }

        try {
            const raw = await recognizer.recognize(candidateUri);
            const text = extractTextFromMlKitResult(raw).trim();
            if (text.length > bestText.length) {
                bestText = text;
                bestUri = candidateUri;
                bestRaw = raw;
            }
        } catch {
            // Ignore this angle and continue sweep.
        }
    }

    // Best-effort crop to text content if bounds are available.
    if (bestRaw) {
        const box = extractContentBox(bestRaw);
        if (box) {
            try {
                const cropped = await ImageManipulator.manipulateAsync(
                    bestUri,
                    [{ crop: { originX: box.x, originY: box.y, width: box.width, height: box.height } }],
                    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
                );
                const recroppedRaw = await recognizer.recognize(cropped.uri);
                const recroppedText = extractTextFromMlKitResult(recroppedRaw).trim();
                if (recroppedText.length >= bestText.length * 0.8) {
                    return { text: recroppedText || bestText, bestUri: cropped.uri, raw: recroppedRaw };
                }
            } catch {
                // If crop/second pass fails, keep first pass result.
            }
        }
    }

    return { text: bestText, bestUri, raw: bestRaw };
}

async function uriToBase64(uri: string): Promise<string | null> {
    try {
        return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    } catch {
        return null;
    }
}

async function parseWithGemini(ocrText: string, imageUri: string): Promise<AddTransactionDraft | null> {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) return null;

    const imageBase64 = await uriToBase64(imageUri);
    if (!imageBase64) return null;

    const prompt = `You are given:
- OCR-extracted text from a receipt (may contain noise)
- The original receipt image

Task: extract structured transaction data with highest accuracy.

OCR Text:
${ocrText || '(empty)'}

Output (STRICT JSON ONLY):
{
  "merchant": string | null,
  "amount": number | null,
  "date": "YYYY-MM-DD" | null,
  "category": string,
  "items": [{ "name": string, "price": number | null }]
}

Rules:
- Use BOTH OCR text and image.
- Prefer OCR text for reading values, use image to correct ambiguity.
- Amount: final payable total (Total/Grand Total/Amount Paid).
- If multiple amounts exist, choose final total.
- If unsure, return null. Do not guess.
- Items can be empty array if unclear.
- Return ONLY valid JSON, no markdown, no explanations.
- Return JSON only. No markdown.
`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                { text: prompt },
                                {
                                    inline_data: {
                                        mime_type: inferMimeType(imageUri),
                                        data: imageBase64,
                                    },
                                },
                            ],
                        },
                    ],
                    generationConfig: { temperature: 0.1 },
                }),
            }
        );

        const data = await response.json();
        const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonTextMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonTextMatch) return null;

        const parsed = JSON.parse(jsonTextMatch[0]) as GeminiTransaction;
        const amount = Number(parsed.amount);
        if (!Number.isFinite(amount) || amount <= 0) return null;

        const fallbackDraft = ParserService.buildAddTransactionDraftFromText(ocrText || '');
        const itemSummary = Array.isArray(parsed.items) && parsed.items.length
            ? parsed.items
                .slice(0, 8)
                .map((it) => `${it?.name || 'Item'}${Number.isFinite(Number(it?.price)) ? `: ${Number(it?.price).toFixed(2)}` : ''}`)
                .join(', ')
            : '';

        return {
            amount,
            title: parsed.merchant || fallbackDraft.title || 'Scanned Receipt',
            category: parsed.category || 'Others',
            type: fallbackDraft.type || 'expense',
            method: fallbackDraft.method || 'Other',
            date: toDate(parsed.date),
            notes: itemSummary ? `Items: ${itemSummary}` : (fallbackDraft.notes || ocrText || 'Receipt scan'),
        };
    } catch {
        return null;
    }
}

export const OcrService = {
    parseImage: async (uri: string): Promise<{ text: string | null; error?: string }> => {
        try {
            const normalized = await normalizeResolution(uri);
            const resized = await resizeImageToMaxLimit(normalized, MAX_UPLOAD_BYTES);
            const mlkit = await runMlKitWithDeskew(resized);
            if (mlkit.text) {
                return { text: mlkit.text };
            }
            return { text: null, error: 'On-device OCR could not detect text.' };
        } catch (error) {
            console.error('On-device OCR Error: ', error);
            return { text: null, error: 'Network error during OCR.' };
        }
    },

    parseImageToTransaction: async (uri: string): Promise<{ draft: AddTransactionDraft | null; error?: string }> => {
        try {
            const normalized = await normalizeResolution(uri);
            const resizedUri = await resizeImageToMaxLimit(normalized, MAX_UPLOAD_BYTES);
            const mlkit = await runMlKitWithDeskew(resizedUri);
            const text = mlkit.text;

            const geminiDraft = await parseWithGemini(text, mlkit.bestUri || resizedUri);
            if (geminiDraft && geminiDraft.amount && geminiDraft.amount > 0) {
                return { draft: geminiDraft };
            }

            const fallbackDraft = ParserService.buildAddTransactionDraftFromText(text || '');
            if (!fallbackDraft.amount || fallbackDraft.amount <= 0) {
                return { draft: null, error: 'Could not extract a valid transaction from the receipt.' };
            }

            return { draft: fallbackDraft };
        } catch {
            return { draft: null, error: 'Network error during OCR processing.' };
        }
    },
};