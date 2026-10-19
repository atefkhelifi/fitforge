import { describe, expect, it } from 'vitest';

import { buildGeminiBody, geminiErrorMessage, GEMINI_MODEL, GEMINI_MODELS, parseGeminiResponse, sanitizeAnalysis, shouldFallBack } from '../meal-ai';

const reply = (obj: unknown) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] });
const rice = { name: 'Rice', grams: 200, kcal: 260, protein_g: 5, carbs_g: 56, fat_g: 0.5, fiber_g: 1, confidence: 0.7 };

describe('buildGeminiBody', () => {
  it('sends the image first, then the text, and asks for schema-shaped JSON', () => {
    const body = buildGeminiBody({ imageBase64: 'AAAA', note: '  with 1 tbsp oil ' });
    const parts = body.contents[0].parts as Record<string, unknown>[];
    expect(parts[0]).toEqual({ inline_data: { mime_type: 'image/jpeg', data: 'AAAA' } });
    expect(parts[1]).toEqual({ text: 'Meal description from the user: with 1 tbsp oil' });
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseJsonSchema.required).toContain('items');
  });

  it('works for text-only input and skips thinking only on flash models', () => {
    const text = buildGeminiBody({ note: '2 eggs' }).contents[0].parts as Record<string, unknown>[];
    expect(text).toHaveLength(1);
    expect(buildGeminiBody({ note: 'x' }, GEMINI_MODEL).generationConfig).toHaveProperty('thinkingConfig');
    expect(buildGeminiBody({ note: 'x' }, 'gemini-2.5-pro').generationConfig).not.toHaveProperty('thinkingConfig');
  });

  it('caps a very long note', () => {
    const parts = buildGeminiBody({ note: 'a'.repeat(900) }).contents[0].parts as { text: string }[];
    expect(parts[0].text.length).toBeLessThan(560);
  });
});

describe('sanitizeAnalysis', () => {
  it('keeps good data', () => {
    const a = sanitizeAnalysis({ is_food: true, dish_name: 'Rice bowl', items: [rice], overall_confidence: 0.7, assumptions: ['Oil not counted'] });
    expect(a.is_food).toBe(true);
    expect(a.items[0]).toMatchObject({ name: 'Rice', kcal: 260 });
    expect(a.assumptions).toEqual(['Oil not counted']);
  });

  it('clamps absurd or invalid numbers', () => {
    const a = sanitizeAnalysis({ is_food: true, dish_name: 'x', items: [{ ...rice, kcal: 9e9, protein_g: -5, grams: NaN, confidence: 7 }], overall_confidence: 2, assumptions: [] });
    expect(a.items[0].kcal).toBe(5000);
    expect(a.items[0].protein_g).toBe(0);
    expect(a.items[0].grams).toBe(0);
    expect(a.items[0].confidence).toBe(1);
    expect(a.overall_confidence).toBe(1);
  });

  it('treats an empty item list or a non-boolean flag as not food', () => {
    expect(sanitizeAnalysis({ is_food: true, dish_name: 'x', items: [], overall_confidence: 1, assumptions: [] }).is_food).toBe(false);
    expect(sanitizeAnalysis({ is_food: 'yes', items: [rice] }).is_food).toBe(false);
  });

  it('survives garbage input', () => {
    expect(sanitizeAnalysis(null).items).toEqual([]);
    expect(sanitizeAnalysis('nope').dish_name).toBe('Meal');
  });
});

describe('parseGeminiResponse', () => {
  it('parses a normal reply', () => {
    const a = parseGeminiResponse(reply({ is_food: true, dish_name: 'Rice', items: [rice], overall_confidence: 0.6, assumptions: [] }));
    expect(a.items).toHaveLength(1);
  });

  it('reports blocked prompts, empty replies and unreadable JSON', () => {
    expect(() => parseGeminiResponse({ promptFeedback: { blockReason: 'SAFETY' } })).toThrow('could not be analysed');
    expect(() => parseGeminiResponse({ candidates: [] })).toThrow('No analysis');
    expect(() => parseGeminiResponse({ candidates: [{ content: { parts: [{ text: 'not json' }] } }] })).toThrow('unreadable');
  });
});

describe('geminiErrorMessage', () => {
  it('gives actionable messages', () => {
    expect(geminiErrorMessage(429, null)).toContain('quota');
    expect(geminiErrorMessage(400, { error: { details: [{ reason: 'API_KEY_INVALID' }] } })).toContain('rejected');
    expect(geminiErrorMessage(403, null)).toContain('rejected');
    expect(geminiErrorMessage(503, null)).toContain('busy');
    expect(geminiErrorMessage(418, null)).toBe('Analysis failed. Try again.');
  });
});

describe('model fallback', () => {
  it('tries the main model first, then a lighter one', () => {
    expect(GEMINI_MODELS[0]).toBe(GEMINI_MODEL);
    expect(GEMINI_MODELS).toHaveLength(2);
    expect(GEMINI_MODELS[1]).toContain('flash-lite');
  });

  it('falls back on overload, rate limits and server errors only', () => {
    for (const status of [429, 500, 502, 503, 504]) expect(shouldFallBack(status)).toBe(true);
    for (const status of [200, 400, 401, 403, 404]) expect(shouldFallBack(status)).toBe(false);
  });
});
