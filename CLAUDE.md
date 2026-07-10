# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project status

This is Natal, an Expo/React Native astrology app, currently at the bare-skeleton stage (Expo template reset, no feature code yet). **`PRD.md` is the authoritative product and architecture spec** — read it before planning any feature work. It defines the target architecture, screens, data model, API contract, voice/tone rules, build order, and explicit non-goals. Notably:

- Architecture: Expo/RN app → FastAPI service (Python, wraps a Kerykeion-based astrology engine) → Supabase (Postgres + Auth). The backend now lives in this repo under `natal-api/` (monorepo): `main.py` (routes), `engine.py` (astrology + Supabase service client), `compat.py` (synastry-lite), `push.py` (Expo Push). Its `.env` and `venv/` are gitignored; run it with `cd natal-api && ./venv/bin/uvicorn main:app --reload` (the app's `EXPO_PUBLIC_API_URL` points at `http://127.0.0.1:8000`).
- Do not reimplement chart/transit calculation logic in JS — it's reused from the Python engine in `natal-api/` via the FastAPI layer.
- PRD §9 lists explicit non-goals (e.g. no Android in MVP, no synastry wheels, no LLM-generated readings) — decline to add these unless the user overrides the PRD.
- PRD §11 has engineering conventions for this codebase (component size, theming via a single `constants/theme.ts`, `lib/api.ts` / `lib/supabase.ts` split, etc.) that don't fully exist yet since the app is still a skeleton — follow them as directories/features are added.

## Commands

- `npm start` — start the Expo dev server (Metro).
- `npm run ios` / `npm run android` / `npm run web` — start the dev server targeting a specific platform.
- `npm run lint` — runs `expo lint`.
- No test runner is configured in this repo yet.
- `npm run reset-project` currently points to a `scripts/reset-project.js` that has been removed from this repo — do not rely on it.

## Architecture / structure notes

- **This project uses `src/app` for Expo Router routes, not the default `app/`.** Path aliases (`tsconfig.json`): `@/*` → `./src/*`, `@/assets/*` → `./assets/*`. Use these aliases for imports instead of relative paths across directories.
- `src/app/_layout.tsx` is the root layout (currently a single `<Stack />`, no tabs configured). `src/app/index.tsx` is the only route.
- `example/` is a copy of the original `create-expo-app` starter (tabs, themed components, hooks, etc.), kept only as a reference for patterns (theming, tab navigation, themed components) and is git-ignored — it is not part of the shipped app and should not be imported from.
- `app.json`: Expo Router + `expo-splash-screen` plugins are configured; `typedRoutes` and `reactCompiler` experiments are both enabled — keep route usage compatible with typed routes, and avoid patterns that fight the React Compiler (manual memoization, mutating refs/state during render).
- TypeScript is `strict: true`.

## Working in this repo

- Because Expo/RN/React versions here are newer than typical training data (Expo ~57, React Native 0.86, React 19.2), verify APIs against the versioned docs (`AGENTS.md` links `https://docs.expo.dev/versions/v57.0.0/`) rather than assuming older Expo behavior.
