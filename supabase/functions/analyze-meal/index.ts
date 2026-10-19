// Supabase Edge Function (Deno): analyses a meal photo and/or description with Google Gemini (free tier).
// The key lives only in function secrets: `supabase secrets set GEMINI_API_KEY=...`
import { createClient } from 'npm:@supabase/supabase-js@2';

const MODEL = Deno.env.get('MEAL_MODEL') ?? 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-2.5-flash-lite';
const DAILY_LIMIT = Number(Deno.env.get('MEAL_DAILY_LIMIT') ?? '30');
const MAX_IMAGE_CHARS = 6_000_000; // base64 characters, about 4.5 MB of image
const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a nutrition analyst. Given a photo of a meal and/or a short text description, identify each food item, estimate its portion in grams using visible cues (plate size, utensils, hands, packaging), and estimate calories and macros per item using standard nutrition databases (USDA-style values, cooked or raw as appropriate).
Rules:
- If the input is not food, set is_food to false and return an empty items list.
- Prefer a realistic mid estimate. Never refuse because of uncertainty; lower the confidence instead.
- Mention likely hidden calories (oils, sauces, dressings) in assumptions when they are probably present but not visible.
- If the user's note gives quantities or cooking details, trust it over the image.
- Confidence values are between 0 and 1.`;

const MEAL_SCHEMA = {
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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const num = (v: unknown, max: number) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : 0;
  return Math.min(max, Math.max(0, n));
};

// The model's numbers are untrusted input: clamp them and compute totals ourselves.
function sanitize(raw: any) {
  const items = (Array.isArray(raw?.items) ? raw.items : []).slice(0, 30).map((i: any) => ({
    name: String(i?.name ?? 'Food').slice(0, 80),
    grams: num(i?.grams, 5000),
    kcal: num(i?.kcal, 5000),
    protein_g: num(i?.protein_g, 500),
    carbs_g: num(i?.carbs_g, 1000),
    fat_g: num(i?.fat_g, 500),
    fiber_g: num(i?.fiber_g, 200),
    confidence: num(i?.confidence, 1),
  }));
  const sum = (k: 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g' | 'fiber_g') =>
    Math.round(items.reduce((s: number, i: any) => s + i[k], 0) * 10) / 10;
  return {
    is_food: raw?.is_food === true && items.length > 0,
    dish_name: String(raw?.dish_name ?? 'Meal').slice(0, 80),
    items,
    totals: { kcal: sum('kcal'), protein_g: sum('protein_g'), carbs_g: sum('carbs_g'), fat_g: sum('fat_g'), fiber_g: sum('fiber_g') },
    overall_confidence: num(raw?.overall_confidence, 1),
    assumptions: (Array.isArray(raw?.assumptions) ? raw.assumptions : []).slice(0, 8).map((a: unknown) => String(a).slice(0, 200)),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Identify the caller from their JWT.
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Sign in to analyse meals.' }, 401);
  const userId = userData.user.id;

  let body: { imageBase64?: string; mediaType?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '';
  const image = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';
  const mediaType = (MEDIA_TYPES as readonly string[]).includes(body.mediaType ?? '') ? body.mediaType! : 'image/jpeg';
  if (!image && !note) return json({ error: 'Send a photo or a description.' }, 400);
  if (image.length > MAX_IMAGE_CHARS) return json({ error: 'Image is too large.' }, 413);

  // Per-user daily rate limit (ai_usage is only reachable with the service role).
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('used_at', since);
  if ((count ?? 0) >= DAILY_LIMIT) return json({ error: `Daily limit of ${DAILY_LIMIT} analyses reached.` }, 429);
  await admin.from('ai_usage').insert({ user_id: userId });

  const parts: Record<string, unknown>[] = [];
  if (image) parts.push({ inline_data: { mime_type: mediaType, data: image } });
  parts.push({ text: note ? `Meal description from the user: ${note}` : 'Analyse this meal.' });

  try {
    // Overload and rate limits are per model, so try the lighter model if the first is busy or slow.
    let res: Response | null = null;
    for (const model of [MODEL, FALLBACK_MODEL]) {
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': Deno.env.get('GEMINI_API_KEY') ?? '' },
          signal: AbortSignal.timeout(25_000),
          body: JSON.stringify({
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
          }),
        });
      } catch (error) {
        console.error('analyze-meal request failed', model, error instanceof Error ? error.name : error);
        res = null; // timeout or network error: try the next model
        continue;
      }
      if (res.ok || !(res.status === 429 || res.status >= 500)) break;
      console.error('analyze-meal falling back after HTTP', res.status, 'from', model);
    }

    if (!res) return json({ error: 'The AI service did not answer in time. Try again.' }, 504);
    if (res.status === 429) return json({ error: 'The free AI quota is used up for now. Try again in a minute.' }, 503);
    if (res.status >= 500) return json({ error: 'The AI service is busy right now. Try again in a minute.' }, 503);
    if (!res.ok) {
      console.error('analyze-meal Gemini error', res.status, (await res.text()).slice(0, 500));
      return json({ error: 'Analysis failed. Try again.' }, 502);
    }

    const data = await res.json();
    if (data?.promptFeedback?.blockReason) return json({ error: 'This meal could not be analysed.' }, 422);
    const text = data?.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => typeof p.text === 'string')?.text;
    if (!text) return json({ error: 'No analysis returned.' }, 502);
    return json(sanitize(JSON.parse(text)));
  } catch (error) {
    console.error('analyze-meal failed', error instanceof Error ? error.message : error);
    return json({ error: 'Analysis failed. Try again.' }, 502);
  }
});
