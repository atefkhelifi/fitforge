# FitForge — Gym, Progress & AI Nutrition App

Cross-platform fitness app (mobile + desktop + web) that gives you:

1. **Training programs** — generated/customised workout plans (split, sets, reps, rest).
2. **Progress tracking (suivi)** — weights, PRs, body measurements, photos, charts.
3. **AI dish analysis** — take a photo of a meal, get calories, protein, carbs, fat (+ fiber, sugar) estimates.

## Docs index

| File | Content |
|---|---|
| [docs/01-product-spec.md](docs/01-product-spec.md) | Features, user stories, screens, MVP scope |
| [docs/02-architecture.md](docs/02-architecture.md) | Tech stack, folders, database schema, security |
| [docs/03-ai-food-analysis.md](docs/03-ai-food-analysis.md) | Model choice, prompt, JSON schema, code, accuracy tips |
| [docs/04-design-system.md](docs/04-design-system.md) | Smart design: tokens, colors, components, responsive rules |
| [docs/07-setup.md](docs/07-setup.md) | Connect Supabase + Gemini: accounts, sync, meal scan, photos |

## Recommended stack (short version)

- **App (iOS + Android + Web):** Expo (React Native) + Expo Router + TypeScript
- **Desktop:** the web build runs in any browser; a Tauri wrapper is planned (needs the Rust toolchain)
- **UI:** plain React Native `StyleSheet` + design tokens, light/dark themes, react-native-svg charts
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions)
- **AI:** Google Gemini free tier (vision) called from a Supabase Edge Function — the API key never ships in the app (other vision models can be swapped in, see docs/03)
- **State/data:** Zustand stores persisted on the device (AsyncStorage), merged with Supabase on sign-in

One codebase → three targets. See architecture doc for why.

## Run it

Needs **Node 22.13 or newer** (Expo requires it; Node 20 crashes the dev server).

```powershell
cd apps\mobile-web
npm install
npm run web        # opens http://localhost:8081
npm test           # unit tests
npm run check-setup   # after connecting Supabase, see docs/07-setup.md
npm run desktop       # desktop window (Tauri); needs Rust + the VS C++ build tools
npm run desktop:build # release build / installer
```

Everything except sign-in, sync, the AI meal scan and photos works with no setup.
