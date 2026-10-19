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

(`setup-all.sql` is just migrations 0001–0006 joined together. If you already ran an older version, run only the newer migration files: 0005 adds checks that stop a user attaching rows to someone else's workout, meal or photo folder, and 0006 lets sets be logged for any exercise from the built-in library (without it, syncing a workout that uses a library exercise fails). If you add a migration later, run only that file.)

## 3. Allow sign-up
Three separate switches decide whether people can sign up. Each one gives a different error when it is off, so check all three (and click **Save** after each; the toggle does nothing until you save):

| Where | Setting | When it is off, sign-up says |
|---|---|---|
| **Authentication > Providers > Email** | **Enable email provider** | "Email signups are disabled" |
| **Authentication > Sign In / Providers** (top of the page; some dashboards: **Settings**) | **Allow new users to sign up** | "Signups not allowed for this instance" |
| **Authentication > Providers > Email** | **Confirm email** | sign-up works but returns no session until the emailed link is clicked |

While developing, turn **Confirm email** **off**, otherwise every test account needs an email click before it can sign in. Turn it back on before real users arrive, and then set **Authentication > URL Configuration > Site URL** to your deployed address so the links in the emails point to the right place.

## 4. Connect the app
1. In **Project Settings > API** copy the **Project URL** and the **anon / publishable key**. Never use the `service_role` / secret key in the app.
2. Copy `apps/mobile-web/.env.example` to `apps/mobile-web/.env` and paste the two values.
3. Restart the dev server so it picks up `.env`.

## 5. Get a free Gemini key (meal scan)
1. Go to https://aistudio.google.com, sign in and click **Get API key**. No card needed.
2. Keep the key private. It is only ever stored as a Supabase secret, never in the app, in `.env` or in a chat. If a key was ever pasted somewhere public, create a new one and delete the old one.

## 6. Deploy the meal-scan function
Run these from the **repo root** (where the `supabase` folder is). The Supabase CLI runs through `npx`, no install needed. `YOUR_REF` is the part of your project URL before `.supabase.co`.

```powershell
npx supabase login                         # opens the browser; wait for "You are now logged in"
npx supabase functions deploy analyze-meal --project-ref YOUR_REF --use-api
npx supabase functions deploy delete-account --project-ref YOUR_REF --use-api   # powers Profile > Delete my account
```

`--use-api` deploys without Docker, and no `supabase init` or `link` is needed when you pass `--project-ref`.

**Set the Gemini key** either in the dashboard (**Edge Functions > Secrets**, name `GEMINI_API_KEY`, which keeps the key out of your terminal history) or with `npx supabase secrets set GEMINI_API_KEY=...`.

**If `login` does not save (the CLI keeps saying "Access token not provided"):** create a token at https://supabase.com/dashboard/account/tokens, set it only for the current terminal (`$env:SUPABASE_ACCESS_TOKEN = "sbp_..."`), run the deploy commands, close the terminal, and then **delete the token** from that page. It can manage your whole account, so never put it in a file or a chat.

Optional secrets: `MEAL_MODEL` (default `gemini-2.5-flash`) and `MEAL_DAILY_LIMIT` (default 30 analyses per user per day).

## 7. Check everything
```powershell
cd apps\mobile-web
npm run check-setup
```
It tells you which step is missing (tables, seed data, both functions) and what to run. It cannot check the Gemini key or whether sign-ups are open; the first scan, or a test sign-up, shows that.

## 7b. Use it on the deployed site
The `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` values are built into the site when it is built. After you create `.env`, rebuild and redeploy (see [09-deploy-vercel.md](09-deploy-vercel.md)); if Vercel builds from GitHub, add the same two variables in the Vercel project instead.

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
| "Email signups are disabled" / "Signups not allowed for this instance" | A sign-up switch is off or not saved, see step 3 |
| `check-setup` says the functions are "not deployed" | Run the deploy commands in step 6 from the repo root, and make sure the CLI is logged in |

## Privacy notes to put in your policy before sharing the app
- Meal photos are sent to Google Gemini for analysis and are not stored by the app. On Google's free tier, requests may be used to improve Google products.
- Progress photos are stored in a private bucket, readable only by their owner through short-lived links.
- Users can delete individual photos, meals and weights, export all their data as a JSON file, delete the data on their device, and permanently delete their account (Profile > Your data). Account deletion needs the `delete-account` function from step 6; it removes the photo files and the account, and every table cascades from the account.
- The export file covers data held on the device. Progress photos live in the account and are not in the file.
