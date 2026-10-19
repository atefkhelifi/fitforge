import type { MealAnalysis, MealItem } from './meal';

// Prompt, schema and sanitising for the meal analysis. The Edge Function in
// supabase/functions/analyze-meal/index.ts keeps its own copy; keep the two in step.

export const GEMINI_MODEL = 'gemini-2.5-flash';

/** Tried in order. Free-tier quotas and overload are per model, so the lighter one is a useful backup. */
export const GEMINI_MODELS = [GEMINI_MODEL, 'gemini-2.5-flash-lite'];

/** Overload, rate limits and server errors are worth retrying on another model; key and request errors are not. */
export const shouldFallBack = (status: number) => status === 429 || status >= 500;

export const SYSTEM_PROMPT = `You are a nutrition analyst. Given a photo of a meal and/or a short text description, identify each food item, estimate its portion in grams using visible cues (plate size, utensils, hands, packaging), and estimate calories and macros per item using standard nutrition databases (USDA-style values, cooked or raw as appropriate).
Rules:
- If the input is not food, set is_food to false and return an empty items list.
- Prefer a realistic mid estimate. Never refuse because of uncertainty; lower the confidence instead.
- Mention likely hidden calories (oils, sauces, dressings) in assumptions when they are probably present but not visible.
- If the user's note gives quantities or cooking details, trust it over the image.
- Confidence values are between 0 and 1.`;

export const MEAL_SCHEMA = {
  type: 'object',
  properties: {
    is_food: { type: 'boolean' },
    dish_name: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          grams: { type: 'number' },
          kcal: { type: 'number' },
          protein_g: { type: 'number' },
          carbs_g: { type: 'number' },
          fat_g: { type: 'number' },
          fiber_g: { type: 'number' },
          confidence: { type: 'number' },
        },
        required: ['name', 'grams', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'confidence'],
        additionalProperties: false,
      },
    },
    overall_confidence: { type: 'number' },
    assumptions: { type: 'array', items: { type: 'string' } },
  },
  required: ['is_food', 'dish_name', 'items', 'overall_confidence', 'assumptions'],
  additionalProperties: false,
};

/** Request body for Gemini's generateContent endpoint. */
export function buildGeminiBody(input: { imageBase64?: string; note?: string }, model = GEMINI_MODEL) {
  const parts: Record<string, unknown>[] = [];
  if (input.imageBase64) parts.push({ inline_data: { mime_type: 'image/jpeg', data: input.imageBase64 } });
  const note = input.note?.trim().slice(0, 500);
  parts.push({ text: note ? `Meal description from the user: ${note}` : 'Analyse this meal.' });

  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseJsonSchema: MEAL_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 4096,
      // Flash models think by default; meal estimates do not need it and it adds seconds.
      ...(model.startsWith('gemini-2.5-flash') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  };
}

const clamp = (v: unknown, max: number) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : 0;
  return Math.min(max, Math.max(0, n));
};

/** The model's numbers are untrusted input: clamp them and drop anything that is not an item. */
export function sanitizeAnalysis(raw: unknown): MealAnalysis {
  const r = (raw ?? {}) as Record<string, unknown>;
  const rawItems = Array.isArray(r.items) ? (r.items as Record<string, unknown>[]) : [];
  const items: MealItem[] = rawItems.slice(0, 30).map((i) => ({
    name: String(i?.name ?? 'Food').slice(0, 80),
    grams: clamp(i?.grams, 5000),
    kcal: clamp(i?.kcal, 5000),
    protein_g: clamp(i?.protein_g, 500),
    carbs_g: clamp(i?.carbs_g, 1000),
    fat_g: clamp(i?.fat_g, 500),
    fiber_g: clamp(i?.fiber_g, 200),
    confidence: clamp(i?.confidence, 1),
  }));
  return {
    is_food: r.is_food === true && items.length > 0,
    dish_name: String(r.dish_name ?? 'Meal').slice(0, 80),
    items,
    overall_confidence: clamp(r.overall_confidence, 1),
    assumptions: (Array.isArray(r.assumptions) ? r.assumptions : []).slice(0, 8).map((a) => String(a).slice(0, 200)),
  };
}

/** Turns a Gemini generateContent response into a sanitised analysis, or throws a user-facing error. */
export function parseGeminiResponse(data: unknown): MealAnalysis {
  const d = data as {
    promptFeedback?: { blockReason?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  if (d?.promptFeedback?.blockReason) throw new Error('This meal could not be analysed.');
  const text = d?.candidates?.[0]?.content?.parts?.find((p) => typeof p.text === 'string')?.text;
  if (!text) throw new Error('No analysis returned. Try again.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('The AI returned an unreadable answer. Try again.');
  }
  return sanitizeAnalysis(parsed);
}

/** Maps a failed Gemini HTTP response to a message the user can act on. */
export function geminiErrorMessage(status: number, body: unknown): string {
  const err = (body as { error?: { status?: string; details?: { reason?: string }[] } } | null)?.error;
  const reason = err?.details?.find((d) => d.reason)?.reason;
  if (status === 429) return 'The free AI quota is used up for now. Try again in a minute.';
  if (status === 503 || status === 500 || status === 504) return 'The AI service is busy right now. Try again in a minute.';
  if (reason === 'API_KEY_INVALID' || status === 401 || status === 403) return 'Google rejected that API key. Check it in Profile > AI meal scan.';
  return 'Analysis failed. Try again.';
}
