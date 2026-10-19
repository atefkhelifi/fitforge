# 07 — Connect Supabase and Gemini (accounts, sync, meal scan, photos)

**Just want the meal scan?** You do not need Supabase for it. Get a free Gemini key (step 5), then in the app open **Profile > AI meal scan**, paste the key and save. Scans then go straight from your device to Google; the key is stored only on your device. Supabase is only needed for accounts, sync across devices, photos and the shared server route.

The app works offline without any of this. Do this once to get sign-in, sync across devices, the AI meal scan and progress photos.
Total time: about 15 minutes. Everything below is free tier.

You need Node 22 (see the README note) and a terminal in `apps/mobile-web`.

## 1. Create the Supabase project
1. Sign up at https://supabase.com and click **New project**. Pick a name, a database password (save it) and a region near you.
2. Wait about 2 minutes until the project is ready.

## 2. Create the database
1. Open **SQL Editor > New query**.
2. Paste the whole contents of `supabase/setup-all.sql` and click **Run**. It creates all tables, the security rules, the exercise list and the private photo bucket.
3. It should end with "Success". Run it **once**: running it twice fails with "already exists", which is harmless but confusing.

(`setup-all.sql` is just migrations 0001–0005 joined together. If you already ran an older version, run only the newer migration files: 0005 adds checks that stop a user attaching rows to someone else's workout, meal or photo folder. If you add a migration later, run only that file.)

## 3. Allow sign-up
**Authentication > Providers > Email**: make sure Email is enabled. While developing, turn **off** "Confirm email", otherwise every test account needs an email click before it can sign in.

## 4. Connect the app
1. In **Project Settings > API** copy the **Project URL** and the **anon / publishable key**. Never use the `service_role` / secret key in the app.
2. Copy `apps/mobile-web/.env.example` to `apps/mobile-web/.env` and paste the two values.
3. Restart the dev server so it picks up `.env`.

## 5. Get a free Gemini key (meal scan)
1. Go to https://aistudio.google.com, sign in and click **Get API key**. No card needed.
2. Keep the key private. It is only ever stored as a Supabase secret, never in the app.

## 6. Deploy the meal-scan function
Run these in `apps/mobile-web` (the Supabase CLI runs through `npx`, no install needed):

```powershell
cd ..\..                                   # repo root, where the supabase folder is
npx supabase init                          # creates supabase/config.toml; answer "n" to the VS Code prompts
npx supabase login                         # opens the browser
npx supabase link --project-ref YOUR_REF   # YOUR_REF is the part of your URL before .supabase.co
npx supabase secrets set GEMINI_API_KEY=YOUR_GEMINI_KEY
npx supabase functions deploy analyze-meal
npx supabase functions deploy delete-account   # powers Profile > Delete my account
```

If `deploy` complains about Docker, try `npx supabase functions deploy analyze-meal --use-api` or check
https://supabase.com/docs/guides/functions/deploy for the current flags.

Optional secrets: `MEAL_MODEL` (default `gemini-2.5-flash`) and `MEAL_DAILY_LIMIT` (default 30 analyses per user per day).

## 7. Check everything
```powershell
cd apps\mobile-web
npm run check-setup
```
It tells you which step is missing (tables, seed data, function) and what to run. It cannot check the Gemini key.

## 8. Try it
1. Open the app, **Profile > Create account**, sign in.
2. Log a workout and a weight. Open **Profile** and tap **Sync now**: it should say "Synced".
3. **Nutrition > Take photo / Gallery > Analyse**. Edit the grams and save.
4. **Progress > Photos**: add a photo.
5. Prove sync works: clear the site data (or open the app on another device), sign in again, and your data comes back.

## Troubleshooting
| Symptom | Likely cause |
|---|---|
| "Sign in to analyse meals" | Not signed in, or signed in on a different project than the one the function is deployed to |
| "Analysis failed. Try again." | Look at **Edge Functions > analyze-meal > Logs**. Usually a missing/wrong `GEMINI_API_KEY` |
| "The free AI quota is used up for now" | Gemini free-tier rate limit. Wait a minute, or try `MEAL_MODEL=gemini-2.5-flash-lite` |
| Workout "Not saved" after finishing | Not signed in, or migration 0001 not run (run `npm run check-setup`) |
| Sync says "Could not upload a meal" | Migration 0003 missing (the `dish_name` column) |
| Photo upload fails | Migration 0004 missing, or the `progress-photos` bucket was deleted |
| Sign-up works but sign-in says email not confirmed | "Confirm email" is on; turn it off or click the email link |

## Privacy notes to put in your policy before sharing the app
- Meal photos are sent to Google Gemini for analysis and are not stored by the app. On Google's free tier, requests may be used to improve Google products.
- Progress photos are stored in a private bucket, readable only by their owner through short-lived links.
- Users can delete individual photos, meals and weights, export all their data as a JSON file, delete the data on their device, and permanently delete their account (Profile > Your data). Account deletion needs the `delete-account` function from step 6; it removes the photo files and the account, and every table cascades from the account.
- The export file covers data held on the device. Progress photos live in the account and are not in the file.
