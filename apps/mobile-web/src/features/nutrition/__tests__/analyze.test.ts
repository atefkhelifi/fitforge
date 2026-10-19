/* eslint-disable import/first -- vi.mock calls must run before the imports they replace */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined },
}));
vi.mock('expo-image-manipulator', () => ({ ImageManipulator: {}, SaveFormat: { JPEG: 'jpeg' } }));
// No Supabase configured: this is the situation behind "Meal analysis needs Supabase".
vi.mock('@/lib/supabase', () => ({ supabase: null }));

import { analyzeMeal, NO_AI_MESSAGE, SIGN_IN_MESSAGE } from '../analyze';
import { useGeminiKey } from '../gemini-key';

const good = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: JSON.stringify({
              is_food: true,
              dish_name: 'Chicken rice bowl',
              items: [{ name: 'Rice', grams: 200, kcal: 260, protein_g: 5, carbs_g: 56, fat_g: 0.5, fiber_g: 1, confidence: 0.7 }],
              overall_confidence: 0.7,
              assumptions: [],
            }),
          },
        ],
      },
    },
  ],
};

const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  useGeminiKey.setState({ apiKey: '' });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('analyzeMeal without Supabase', () => {
  it('asks for a key instead of saying Supabase is required', async () => {
    await expect(analyzeMeal({ note: '2 eggs' })).rejects.toThrow(NO_AI_MESSAGE);
    expect(NO_AI_MESSAGE).toContain('Gemini key');
    expect(NO_AI_MESSAGE).not.toMatch(/^Meal analysis needs Supabase/);
  });

  it('keeps the two messages distinct and never mentions a real key', () => {
    expect(SIGN_IN_MESSAGE).toMatch(/^Sign in/);
    expect(SIGN_IN_MESSAGE).not.toBe(NO_AI_MESSAGE);
    expect(`${SIGN_IN_MESSAGE}${NO_AI_MESSAGE}`).not.toMatch(/AQ\.|AIza/);
  });

  it('analyses with the user\'s own key, calling Google directly', async () => {
    useGeminiKey.setState({ apiKey: 'AIza-test-key-0000000000000000000' });
    const fetchMock = vi.fn().mockResolvedValue(respond(200, good));
    vi.stubGlobal('fetch', fetchMock);

    const result = await analyzeMeal({ imageBase64: 'AAAA', note: 'lunch' });

    expect(result.dish_name).toBe('Chicken rice bowl');
    expect(result.items[0].kcal).toBe(260);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('generativelanguage.googleapis.com');
    expect(String(url)).toContain(':generateContent');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('AIza-test-key-0000000000000000000');
    const sent = JSON.parse(init.body as string);
    expect(sent.contents[0].parts[0].inline_data.data).toBe('AAAA');
  });

  it('explains a rejected key', async () => {
    useGeminiKey.setState({ apiKey: 'AIza-bad-key-00000000000000000000' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(400, { error: { status: 'INVALID_ARGUMENT', details: [{ reason: 'API_KEY_INVALID' }] } })));
    await expect(analyzeMeal({ note: 'x' })).rejects.toThrow('rejected that API key');
  });

  it('explains the free quota limit', async () => {
    useGeminiKey.setState({ apiKey: 'AIza-test-key-0000000000000000000' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(429, { error: { status: 'RESOURCE_EXHAUSTED' } })));
    await expect(analyzeMeal({ note: 'x' })).rejects.toThrow('quota');
  });

  it('reports a network failure clearly', async () => {
    useGeminiKey.setState({ apiKey: 'AIza-test-key-0000000000000000000' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(analyzeMeal({ note: 'x' })).rejects.toThrow('Could not reach Google');
  });

  it('turns a non-food answer into is_food=false', async () => {
    useGeminiKey.setState({ apiKey: 'AIza-test-key-0000000000000000000' });
    const notFood = { candidates: [{ content: { parts: [{ text: JSON.stringify({ is_food: false, dish_name: '', items: [], overall_confidence: 0.9, assumptions: [] }) }] } }] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(200, notFood)));
    const result = await analyzeMeal({ imageBase64: 'AAAA' });
    expect(result.is_food).toBe(false);
  });
});

describe('when the AI is busy or slow', () => {
  const key = 'AIza-test-key-0000000000000000000';
  const modelOf = (call: unknown[]) => (String(call[0]).match(/models\/([^:]+):/) ?? [])[1];

  it('falls back to the lighter model when the first is overloaded (503)', async () => {
    useGeminiKey.setState({ apiKey: key });
    const fetchMock = vi.fn().mockResolvedValueOnce(respond(503, { error: { status: 'UNAVAILABLE' } })).mockResolvedValueOnce(respond(200, good));
    vi.stubGlobal('fetch', fetchMock);

    const result = await analyzeMeal({ note: 'x' });

    expect(result.dish_name).toBe('Chicken rice bowl');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(modelOf(fetchMock.mock.calls[0])).toBe('gemini-2.5-flash');
    expect(modelOf(fetchMock.mock.calls[1])).toBe('gemini-2.5-flash-lite');
  });

  it('also falls back on a quota error (limits are per model)', async () => {
    useGeminiKey.setState({ apiKey: key });
    const fetchMock = vi.fn().mockResolvedValueOnce(respond(429, {})).mockResolvedValueOnce(respond(200, good));
    vi.stubGlobal('fetch', fetchMock);
    await expect(analyzeMeal({ note: 'x' })).resolves.toMatchObject({ is_food: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('says the service is busy when both models are overloaded', async () => {
    useGeminiKey.setState({ apiKey: key });
    const fetchMock = vi.fn().mockResolvedValue(respond(503, { error: { status: 'UNAVAILABLE' } }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(analyzeMeal({ note: 'x' })).rejects.toThrow('busy right now');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls back when a request times out', async () => {
    useGeminiKey.setState({ apiKey: key });
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const fetchMock = vi.fn().mockRejectedValueOnce(abort).mockResolvedValueOnce(respond(200, good));
    vi.stubGlobal('fetch', fetchMock);
    await expect(analyzeMeal({ note: 'x' })).resolves.toMatchObject({ is_food: true });
  });

  it('does not retry on a rejected key (another model would not help)', async () => {
    useGeminiKey.setState({ apiKey: key });
    const fetchMock = vi.fn().mockResolvedValue(respond(400, { error: { details: [{ reason: 'API_KEY_INVALID' }] } }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(analyzeMeal({ note: 'x' })).rejects.toThrow('rejected that API key');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives each request a time limit', async () => {
    useGeminiKey.setState({ apiKey: key });
    const fetchMock = vi.fn().mockResolvedValue(respond(200, good));
    vi.stubGlobal('fetch', fetchMock);
    await analyzeMeal({ note: 'x' });
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal).toBeInstanceOf(AbortSignal);
  });
});
