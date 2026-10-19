# 09 — Deploy the web app to Vercel

The web version of FitForge is a static site (a single-page app). Vercel, Netlify, Cloudflare Pages and similar hosts can serve it.
This guide uses Vercel. The configuration is already in the repo: `apps/mobile-web/vercel.json` and `engines` in `apps/mobile-web/package.json`.

## What you need
- A free Vercel account (https://vercel.com, "Continue with GitHub" is the easiest).
- This repository on GitHub (already there).
- Optional: your Supabase URL and anon key if you want accounts, sync and photos (see [07-setup.md](07-setup.md)). Without them the app runs in local mode, which is fine.

## Steps (about 5 minutes)
1. In Vercel click **Add New → Project**, then **Import** the `fitforge` repository.
2. **Root Directory:** click *Edit* and choose `apps/mobile-web`. This is the one setting that matters most.
3. **Framework Preset:** leave it as *Other*. The build and output settings come from `vercel.json`, so do not override them:
   - Build command: `npx expo export --platform web`
   - Output directory: `dist`
4. **Node.js version:** it follows `engines` (22.x). If a build fails on the Node version, open *Settings → General → Node.js Version* and select 22.x.
5. **Environment Variables** (only if you use Supabase), for Production and Preview:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

   These are **built into the site**, so anyone can read them. That is fine for the URL and the anon key (Row Level Security protects the data). **Never** put a `service_role` / secret key, a Gemini key or any other secret in a variable that starts with `EXPO_PUBLIC_`. After changing a variable you must redeploy for it to take effect.
6. Click **Deploy**. You get an address like `https://fitforge-xxxx.vercel.app`. Every later push to `main` redeploys automatically, and other branches get preview links.

Command-line alternative: in `apps/mobile-web` run `npx vercel` (first time, it asks you to log in and link the project), then `npx vercel --prod`.

## Do this after the first deploy
- Open the address and **reload a deep page** such as `/train/library`. It should show the library, not a 404.
- Open it on your phone. Over HTTPS the **Take photo** button in the meal scan works (browsers only allow the live camera on secure pages).
- **If you use Supabase:** in *Authentication → URL Configuration* set **Site URL** to your Vercel address and add it to **Redirect URLs**. Otherwise confirmation emails link back to the wrong place.
- Paste a Gemini key in *Profile → AI meal scan* to try the meal scan (it is stored only in that browser).

## Things to decide before sharing the link widely
- **Vercel's free plan is for personal, non-commercial use.** For anything commercial use a paid plan, or a host whose free plan allows commercial use (for example Cloudflare Pages).
- **Each visitor's data stays in their own browser.** There is no shared data unless you connect Supabase, and even then there is no way to move data between browsers except by signing in.
- **Open sign-ups and your AI quota.** If Supabase sign-ups are open, anyone can create an account and use the shared meal-scan function. Each account is limited to 30 scans a day, but many accounts add up and use your free Gemini quota. Turn on email confirmation and watch usage, or leave the shared function off and let visitors use their own key.
- **Privacy policy.** The app handles health-related data, so publish a short policy. Mention that meal photos are sent to Google when scanned.
- **Exercise photos.** The data is public domain, but the original source of the photographs is undocumented (see [THIRD_PARTY.md](../THIRD_PARTY.md)). Check this before any commercial use.
- **Not a full offline app.** "Add to Home Screen" gives a shortcut, but there is no service worker, so it needs a connection to start.

## What has been checked
- `vercel.json` validates against Vercel's published schema.
- A clean production build (`npx expo export --platform web`, no environment variables, npm install with `force` turned off) succeeds in about 25 seconds: 36 files, about 2.9 MB.
- Served with the same routing and header rules as `vercel.json`, in a real browser: the first-visit setup screen, reloading `/train/library` and an exercise page directly, photos loading from the CDN, local mode without Supabase keys, a clean not-found screen, no failing requests, no page errors. Without the rewrite rule the deep links return 404, which is why it is there.
- Environment variables starting with `EXPO_PUBLIC_` are built into the bundle, and nothing leaks into a build made without them.

**Not checked:** an actual deployment on Vercel, which needs your account. If the first build fails, send the build log.

## Troubleshooting
| Symptom | Likely cause |
|---|---|
| Build fails with a Node error | Node.js version in the Vercel project is not 22.x |
| Build fails on `npm install` | Look for a dependency conflict in the log; your local npm may hide it (it ignores conflicts if `force` is set) |
| Blank page, or 404 when reloading `/train/...` | Root Directory is not `apps/mobile-web`, so `vercel.json` was not used |
| Works locally but "LOCAL MODE" on Vercel | The two environment variables are missing, or were added after the build (redeploy) |
| Sign-up emails link to localhost | Site URL / Redirect URLs not set in Supabase |
| Photos missing | The visitor is offline or a content blocker blocks `cdn.jsdelivr.net` |
