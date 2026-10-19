# 01 — Product Spec

## Personas
- **Beginner:** wants a ready program and simple guidance.
- **Intermediate lifter:** wants logging, progressive overload, PR tracking.
- **Cutting/bulking user:** wants fast calorie/macro logging from photos.

## Core modules

### 1. Programs
- Onboarding: goal (fat loss / muscle / strength), level, days per week, equipment, injuries.
- Program generator: rule-based templates (Full body, Upper/Lower, PPL, 5x5) + optional AI tailoring.
- Exercise library: name, muscles, equipment, video/GIF, cues, alternatives.
- Workout session screen: set-by-set logging (weight, reps, RPE), rest timer, previous-session values shown inline, superset support.
- Progressive overload suggestion: if all target reps hit at RPE ≤ 8 → suggest +2.5 kg next time.
- Custom programs: create/duplicate/edit.

### 2. Suivi / Progress tracking
- Body: weight, body-fat %, measurements (chest, waist, arms, thighs), progress photos (side-by-side compare).
- Strength: per-exercise 1RM estimate (Epley: `w * (1 + reps/30)`), PR timeline, volume per muscle/week.
- Consistency: streak, sessions/week, calendar heatmap.
- Nutrition trend: daily calories/macros vs target, 7-day average.
- Weekly report: summary card + AI-written insight (optional).

### 3. AI Nutrition
- Camera / gallery photo of a dish → analysis (see doc 03).
- Output: dish name, items detected, portion estimate (g), calories, protein, carbs, fat, fiber, confidence.
- User can **edit** items/portions → totals recompute locally.
- Save to meal (breakfast/lunch/dinner/snack); daily ring chart vs target.
- Text fallback: "2 eggs, 100g rice" → same analyzer.
- Daily targets computed from Mifflin-St Jeor + activity + goal.

## Screens
1. Onboarding (3–5 steps)
2. Home / Today (today's workout, calorie ring, streak, quick actions)
3. Programs list → Program detail → Workout session
4. Exercise library + detail
5. Progress (tabs: Strength · Body · Nutrition · Photos)
6. Nutrition (Today log, Scan, Meal detail)
7. Profile & settings (units, theme, targets, export data)

## MVP scope (v1)
- Auth, onboarding, 3 program templates, workout logging with rest timer
- Weight + strength charts
- Photo meal analysis + daily log
- Light/dark theme, mobile + web responsive

## Later
Apple Health / Health Connect sync, wearables, social/friends, coach mode, barcode scan, push reminders, subscriptions.

## Non-functional
- Offline-first logging (sync when online)
- Meal analysis < 6 s p95
- GDPR: data export + delete account; photos private by default
- Medical disclaimer: estimates only, not medical advice
