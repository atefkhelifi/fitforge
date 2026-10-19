import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { analysisSchema, MealAnalysis } from '@/lib/meal';
import { buildGeminiBody, GEMINI_MODELS, geminiErrorMessage, parseGeminiResponse, shouldFallBack } from '@/lib/meal-ai';
import { supabase } from '@/lib/supabase';

import { useGeminiKey } from './gemini-key';

type Input = { imageBase64?: string; note?: string };

/** Shown when the app has no account system at all (no Supabase configured). */
export const NO_AI_MESSAGE =
  'To analyse meals, add a free Gemini key in Profile > AI meal scan, or connect Supabase (docs/07-setup.md).';

/** Shown when accounts exist but the visitor is signed out and has no key of their own. */
export const SIGN_IN_MESSAGE = 'Sign in (free) to analyse meals. Go to Profile > Account.';

/** Shrinks a photo to ~1024 px JPEG so the upload is small and the analysis fast. */
export async function prepareImage(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: 1024 });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!result.base64) throw new Error('Could not read the photo.');
  return result.base64;
}

/** Signed-in users go through the Supabase Edge Function (the API key stays on the server). */
async function analyzeViaServer(client: NonNullable<typeof supabase>, input: Input): Promise<MealAnalysis> {
  const { data, error } = await client.functions.invoke('analyze-meal', {
    body: { imageBase64: input.imageBase64, mediaType: 'image/jpeg', note: input.note },
  });

  if (error) {
    let message = 'Analysis failed. Try again.';
    const response = (error as { context?: unknown }).context;
    if (response instanceof Response) {
      try {
        const body = await response.json();
        if (typeof body?.error === 'string') message = body.error;
      } catch {
        // keep the generic message
      }
    }
    throw new Error(message);
  }

  const parsed = analysisSchema.safeParse(data);
  if (!parsed.success) throw new Error('The AI returned an unexpected answer. Try again.');
  return parsed.data;
}

const REQUEST_TIMEOUT_MS = 30_000;

type Attempt = { ok: true; data: unknown } | { ok: false; status: number; body: unknown };

async function callGemini(apiKey: string, model: string, input: Input): Promise<Attempt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(buildGeminiBody(input, model)),
      signal: controller.signal,
    });
    if (res.ok) return { ok: true, data: await res.json() };
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // not JSON
    }
    return { ok: false, status: res.status, body };
  } catch (e) {
    // Aborted by the timeout counts as the service being slow; anything else is a network failure.
    return { ok: false, status: e instanceof Error && e.name === 'AbortError' ? 504 : 0, body: null };
  } finally {
    clearTimeout(timer);
  }
}

/** Calls Google directly with the user's own key (no account needed), falling back to a lighter model when busy. */
async function analyzeWithOwnKey(apiKey: string, input: Input): Promise<MealAnalysis> {
  let last: Extract<Attempt, { ok: false }> = { ok: false, status: 0, body: null };
  for (const model of GEMINI_MODELS) {
    const attempt = await callGemini(apiKey, model, input);
    if (attempt.ok) {
      // parseGeminiResponse already sanitises the shape, so this only guards against a future mismatch.
      const parsed = analysisSchema.safeParse(parseGeminiResponse(attempt.data));
      if (!parsed.success) throw new Error('The AI returned an unexpected answer. Try again.');
      return parsed.data;
    }
    last = attempt;
    if (attempt.status !== 0 && !shouldFallBack(attempt.status)) break; // bad key or bad request: another model will not help
  }
  if (last.status === 0) throw new Error('Could not reach Google. Check your internet connection.');
  throw new Error(geminiErrorMessage(last.status, last.body));
}

export async function analyzeMeal(input: Input): Promise<MealAnalysis> {
  const ownKey = useGeminiKey.getState().apiKey;

  if (supabase) {
    const { data: auth } = await supabase.auth.getSession();
    if (auth.session) {
      try {
        return await analyzeViaServer(supabase, input);
      } catch (e) {
        // If the server route is not available but the user has their own key, use that instead.
        if (!ownKey) throw e;
      }
    }
  }

  if (ownKey) return analyzeWithOwnKey(ownKey, input);
  throw new Error(supabase ? SIGN_IN_MESSAGE : NO_AI_MESSAGE);
}
