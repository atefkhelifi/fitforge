# FitForge app (Expo + Tauri)

The app code for FitForge: workout programs, progress tracking and AI meal analysis, for phone, web and desktop from one codebase.

The project overview, architecture and setup guides are in the [root README](../../README.md) and the [docs](../../docs).

## Commands

Needs **Node 22.13 or newer**.

```bash
npm install
npm run web             # run in the browser (http://localhost:8081)
npm start               # Expo dev server; press a for Android
npm test                # unit tests
npm run lint
npx tsc --noEmit        # type check
npm run check-setup     # verify your Supabase project (see docs/07-setup.md)
npm run desktop         # desktop window (needs Rust and the Visual Studio C++ build tools)
npm run desktop:build   # Windows installer
```

Copy `.env.example` to `.env` only if you connect Supabase. The app works without it.
