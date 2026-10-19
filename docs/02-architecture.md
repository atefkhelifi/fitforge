# 02 — Architecture

## Why Expo + Tauri
- One TypeScript codebase for iOS, Android and web (react-native-web).
- Desktop = Tauri shell around the web build (small binary ~10 MB, vs Electron ~100 MB). Electron is fine if you need Node APIs.
- Camera: `expo-camera` / `expo-image-picker` on mobile, `<input type="file" capture>` on web/desktop.

## Diagram
```
 Expo app (iOS/Android/Web) ──┐
 Tauri desktop (web build)  ──┤──► Supabase
                              │     ├─ Auth (email, Google, Apple)
                              │     ├─ Postgres (+ RLS)
                              │     ├─ Storage (meal & progress photos)
                              │     └─ Edge Function: analyze-meal ──► Gemini API (vision)
```

## Folder structure
```
gym-app/
├─ apps/
│  ├─ mobile-web/         # Expo app (Expo Router)
│  │  ├─ app/             # routes: (tabs)/home, programs, progress, nutrition
│  │  ├─ components/ui/   # design-system components
│  │  ├─ features/        # workouts/, progress/, nutrition/, onboarding/
│  │  ├─ lib/             # supabase client, api, formulas
│  │  └─ theme/           # tokens
│  └─ desktop/            # Tauri config
├─ supabase/
│  ├─ migrations/
│  └─ functions/analyze-meal/
├─ packages/shared/       # types, zod schemas, formulas (1RM, BMR, macros)
└─ docs/
```

## Database schema (Postgres)
```sql
profiles(id uuid pk → auth.users, name, sex, birth_date, height_cm, goal, activity_level, units, kcal_target, protein_target, carb_target, fat_target)
exercises(id, name, muscle_primary, muscles_secondary[], equipment, video_url, instructions)
programs(id, owner_id null=template, name, goal, days_per_week)
program_days(id, program_id, day_index, name)
program_exercises(id, program_day_id, exercise_id, order, sets, rep_min, rep_max, rest_s)
workout_sessions(id, user_id, program_day_id, started_at, ended_at, notes)
set_logs(id, session_id, exercise_id, set_no, weight_kg, reps, rpe, is_pr)
body_metrics(id, user_id, date, weight_kg, body_fat_pct, measurements jsonb)
progress_photos(id, user_id, date, storage_path, angle)
meals(id, user_id, eaten_at, meal_type, photo_path, source 'photo'|'text'|'manual')
meal_items(id, meal_id, name, grams, kcal, protein_g, carbs_g, fat_g, fiber_g, confidence)
```
**Row Level Security:** every user table `using (user_id = auth.uid())`. Templates (`owner_id is null`) readable by all.

## Security
- AI provider keys only in Edge Function secrets (or, in the no-account mode, on the user's own device).
- Validate image type/size (≤ 4 MB after client-side resize to ~1024 px).
- Rate-limit analyze-meal per user (e.g. 30/day free tier).
- Signed URLs for photos; delete photo after analysis if user opts out.

## Offline
Local SQLite/MMKV queue for set logs; sync on reconnect with last-write-wins per row.
