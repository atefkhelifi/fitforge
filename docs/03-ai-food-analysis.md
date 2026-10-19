# 03 — AI Dish Analysis (calories, protein, carbs, fat)

## Model choice
The implemented analyzer uses **Google Gemini on the free tier** (vision + JSON output), called server-side from the Edge Function.
- `gemini-2.5-flash` — default (`MEAL_MODEL` secret to change it). Free of charge on the free tier.
- `gemini-2.5-flash-lite` — faster and lighter on quota, a bit less accurate.
- Free-tier limits are shown in Google AI Studio; they change, so check there. Google may use free-tier requests to improve its products, so mention that in your privacy policy.
- Other vision models can be swapped in by changing the request in `analyze.ts` and in the Edge Function; the prompt and JSON schema stay the same.

## Flow
1. Client resizes the photo (1024 px wide, JPEG) and sends it as base64 to the Edge Function `analyze-meal` with an optional `note`. The photo is not stored.
2. The function checks the user's JWT and a daily limit (`ai_usage` table, default 30/day).
3. Function sends image + system prompt to Gemini (`responseJsonSchema`) and gets a JSON result; numbers are clamped and totals computed server-side.
4. Validate with zod → return to client → user reviews/edits → saved to `meals` + `meal_items`.

## Output schema
```json
{
  "dish_name": "Chicken rice bowl",
  "items": [
    { "name": "Grilled chicken breast", "grams": 150, "kcal": 248, "protein_g": 46, "carbs_g": 0, "fat_g": 5, "fiber_g": 0, "confidence": 0.8 },
    { "name": "White rice, cooked",     "grams": 200, "kcal": 260, "protein_g": 5,  "carbs_g": 56, "fat_g": 0.5, "fiber_g": 1, "confidence": 0.7 }
  ],
  "totals": { "kcal": 508, "protein_g": 51, "carbs_g": 56, "fat_g": 5.5, "fiber_g": 1 },
  "overall_confidence": 0.72,
  "assumptions": ["Rice portion estimated from plate size", "Olive oil not visible, not counted"],
  "is_food": true
}
```

## System prompt (starter)
```
You are a nutrition analyst. Given a photo of a meal (and optional user note), identify each
food item, estimate its portion in grams using visible cues (plate size, utensils, hand,
packaging), and estimate calories and macros per item using standard nutrition databases
(USDA-style values for cooked/raw as appropriate).
Rules:
- If the image is not food, set is_food=false and return empty items.
- Prefer a realistic mid estimate; never refuse because of uncertainty — lower confidence instead.
- Mention hidden calories (oils, sauces, dressings) in "assumptions" when likely.
- Totals must equal the sum of items.
- Respond only with JSON matching the schema.
```

## Where the code lives
- Server route: `supabase/functions/analyze-meal/index.ts` (Deno Edge Function): checks the user's JWT and a daily limit, calls Gemini, clamps the numbers and computes totals.
- Own-key route and shared helpers: `src/lib/meal-ai.ts` (prompt, JSON schema, sanitising) and `src/features/nutrition/analyze.ts` (request, timeout, model fallback).

## Accuracy tips
- Let users correct portions (slider in grams); recompute macros locally = trust + better UX.
- Ask for a reference object / top-down angle in the camera guide overlay.
- Add "Add note" (e.g. "cooked with 1 tbsp oil") passed to the model.
- Remember user corrections ("my usual portion") and inject as context.
- Show a range (e.g. 480–560 kcal) when confidence < 0.6.
- Optional: cross-check items against a food DB (USDA FoodData Central, Open Food Facts) to replace per-100g values while keeping the model's portion estimate.

## Disclaimer (show in app)
"Estimates only. Not medical or dietary advice."

## Two ways the app reaches the model
1. **Signed in (Supabase):** the app calls the `analyze-meal` Edge Function. The Gemini key stays on the server and there is a per-user daily limit. Use this for anything you share with other people.
2. **Own key (no account):** the user pastes their own Gemini key in Profile > AI meal scan. The app then calls Google directly from the device. The key is the user's own, stored in device storage and never in the app bundle. Fine for personal use; do not put *your* key in a build you distribute.

The prompt, schema and number-clamping live in `src/lib/meal-ai.ts` (client) and `supabase/functions/analyze-meal/index.ts` (server). Keep the two copies in step.
