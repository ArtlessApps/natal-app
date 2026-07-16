# PRD — Natal (working title)
### A natal-chart companion app that learns from your life

**Version:** 1.0 (MVP) · **Platform:** iOS first (via React Native + Expo), Android later · **Author:** Founder + Claude · **Status:** In development

> **How to use this doc in Cursor:** keep this file at the project root as `PRD.md`. When asking Cursor to build a feature, reference it with `@PRD.md` so every generation follows the same product decisions, data model, and conventions. For pricing, tiers, and paywalls, also reference `@MONETIZATION.md` — that file wins if the two conflict.

---

## 1. Product summary

Natal is a mobile astrology app built on the "Proven, Better, New" framework:

- **Proven (copy what works — Co-Star's core):** instant free natal chart from birth data, one personalized daily push notification driven by real transits, Connection chart comparison, a strong editorial voice, generous free tier.
- **Better (fix Co-Star's documented complaints):** every reading explains *why* (the actual transit behind it); every placement is tappable and teaches; a structured Learn journey (Big 3 → planets → houses → aspects → transits) using the user's own chart as the example; tone is honest but never nihilistic.
- **New (our bet — the journal):** each daily reading ends with one reflective prompt tied to that day's transit. Entries are tagged with the active transit. The **Echo** feature resurfaces past entries when a similar transit recurs ("Last time Mars squared your Sun, you wrote…"). Over time the app becomes a personalized record no competitor has.

**One-line pitch:** Co-Star tells you what the sky is doing. Natal remembers what it did to *you*.

---

## 2. Target user

- Primary: 20–40, has used Co-Star/The Pattern/CHANI, finds daily readings generic, curious to actually understand their chart.
- Secondary: journaling/self-reflection audience (Day One, Stoic users) who are astrology-curious.
- Anti-user (not designing for): professional astrologers needing every technical option (they have TimePassages/Astro.com).

---

## 3. Architecture (already decided — do not revisit)

```
[Expo / React Native app (TypeScript)]
        │  HTTPS/JSON
        ▼
[FastAPI service (Python) — wraps existing Kerykeion engine]
        │
        ▼
[Supabase (Postgres) — auth, users, journal, content tables]
```

- **Mobile app:** Expo SDK (latest), Expo Router (file-based navigation), TypeScript.
- **Backend:** FastAPI wrapping the founder's EXISTING chart engine (Kerykeion `AstrologicalSubjectFactory` + `ChartDataFactory`). The engine already handles: natal charts, daily transit charts at noon UTC, aspect filtering (conjunction/square/opposition/trine/sextile), per-planet orb limits and cooldowns, priority bucketing (outer > moderate > minor), intensity tags (COLLISION / TRANSIT / RIPPLE), "Walking" fallback (rotating planet spotlight by sign + phase, incl. Moon New/Full approximation), natal-house placement of transit planets, and anti-repetition content selection. **Reuse this logic; do not reimplement it in JS.**
- **Database:** Supabase. Existing content tables stay as-is: `content_collisions` (keyed transit_planet, natal_planet, aspect, intensity), `content_walking` (transit_planet, sign, phase), `content_natal` (planet, sign, house). New tables added for app features (see §7).
- **Auth:** Supabase Auth — Sign in with Apple (required for iOS) + email magic link.
- **Push:** Expo Push Notifications; a daily scheduled job (Supabase Edge Function or cron on the API host) computes each user's reading and sends the push.
- **LLM (Phase 2, optional):** Claude API may rewrite/personalize content-table text using recent journal themes. MVP ships on content tables alone.
- **Repo layout (monorepo, since Step 8.6):** the FastAPI backend was a sibling folder; it now lives in this repo under `natal-api/` (`main.py` routes, `engine.py` chart logic + Supabase service client, `compat.py`, `push.py`). App and backend are versioned together. `natal-api/.env` and `natal-api/venv/` are gitignored. Run locally with `cd natal-api && ./venv/bin/uvicorn main:app --reload`; the app's `EXPO_PUBLIC_API_URL` points at `http://127.0.0.1:8000` for local dev. **Deployed (Build Phase 10):** `natal-api` runs on Railway at `https://natal-app-production.up.railway.app`; the app's `EXPO_PUBLIC_API_URL` points there in production. The web build (Expo static export, for invite links) is deployed separately to Vercel — see the `EXPO_PUBLIC_WEB_URL` item in §8a.

---

## 4. Screens & requirements (MVP)

### 4.1 Onboarding
- Collect: name, birth date, birth time (with "unknown time" fallback → noon chart, note limitation), birth place (place search → lat/lng; timezone derived server-side via timezonefinder).
- On submit → `POST /natal` → store chart JSON on the user record → reveal **Big 3** (Sun/Moon/Rising) with one-line meanings.
- Request notification permission immediately after Big 3 reveal.
- Must be completable in under 2 minutes.

### 4.2 Today (home tab)
- Header: date + short headline (same text as the push).
- Body: 2–4 short paragraphs from the engine's content pick for (user, today) — collision, transit, ripple, or walking.
- **"Why?" disclosure:** expandable row showing the technical driver, e.g. "Transiting Saturn ♄ square natal Venus ♀ (orb 0.8°)" with a one-paragraph mini-lesson. Tag COLLISION/TRANSIT/RIPPLE shown as a badge.
- **Journal prompt:** one reflective question mapped to the day's transit, with inline text box. Saving creates a journal entry pre-tagged with the transit.
- **Echo card:** if a past entry exists whose transit tag matches today's (same transit_planet + natal_planet + aspect; fallback: same transit_planet + aspect), show excerpt + date + link. Max one Echo per day.

### 4.3 Journal (tab)
- Reverse-chronological entries. Each shows: date, excerpt, transit tag chip (e.g. "Mars □ Sun"), intensity badge.
- Filter by: transit planet, aspect type, intensity, Full/New Moon.
- Entry detail: full text, that day's reading (snapshot), edit/delete.
- Entries are PRIVATE. No sharing in MVP. State this in UI copy ("Your journal is never shared or sold").

### 4.4 Learn (tab)
- Level-based path. MVP ships **Level 1: Your Big 3** (3 lessons) + **Level 2: Your Planets** (7 lessons). Levels 3–5 shown locked with titles (Houses, Aspects, Transits).
- Every lesson uses the USER'S chart data as its example (pull placement from stored chart; lesson content from `content_natal` keyed by planet/sign/house).
- Progress = lessons completed; show "% of your chart you can read." No streaks, no XP.
- Free tier: Levels 1–2. Paid: Levels 3–5 unlock with **Natal Plus** (RevenueCat entitlement `plus`; shared `PaywallSheet` — see `MONETIZATION.md`).

### 4.5 Connections (tab)
> **Terminology:** user-facing name is **Connections** everywhere (tab, titles, CTAs). Internal routes/table still use `friends` (`/(tabs)/friends`, `friends` table) — rename opportunistically, not as a risky mass refactor. Spec authority: `MONETIZATION.md` §1.

- **Primary flow — invite link with a staged web reveal (Step 8.6):** owner taps Invite → a pending `friends` row + DB token → share sheet with `/invite/<token>`. The guest opens the link (no account) and moves through landing → their own birth form → **their own Big 3** (the gift) → a locked comparison + store gate. On completion the owner gets the "compatibility is ready" push. Gift before gate: the guest's personal Big 3 is unconditional; only the comparison is locked.
- **Secondary flow — manual entry:** the owner types the Connection's birth details themselves (`/friends/add`).
- Comparison view: side-by-side Big 3 + 3–4 compatibility insights (server-computed synastry-lite: Sun–Sun, Moon–Moon, Venus–Mars aspects using existing aspect code).
- Shareable image card (Big 3 comparison) for social distribution.
- Free tier: **1 Connection**. Natal Plus: unlimited up to hard cap 20. **Pending invites count toward the cap**; deleting a stale pending frees a slot. At the free limit the invite CTA stays visible and opens `PaywallSheet` (`source="connection_limit"`).

### 4.6 My Chart (tab)
- Chart wheel (MVP: a clean placement LIST grouped by planet with sign/house/degree is acceptable; wheel graphic is Phase 2).
- Every placement row taps through to its Learn lesson / `content_natal` entry.
- House ring + transit-calendar entry point gate behind Natal Plus (`PaywallSheet` sources `chart_interpretation` / `transit_calendar`).

### 4.7 Push notification (daily)
- One per user per day, ~08:00 local time.
- Text = Today headline. Deep-links to Today tab.
- Tone rule (hard requirement): direct and specific, never doom-flavored. Banned vibes: fatalism, "you are avoiding something"-style vague accusations, anything that reads as a horoscope-shaped insult.
- **Compatibility-ready push (Step 8.6):** when a guest completes an invite, the owner gets "Your compatibility is ready — {guest} just added their chart. See how your skies fit." with `data.url = /friends/<id>`, routed by the existing notification listener. Same voice rule as the daily push.

---

## 5. Voice & tone

- Direct, warm, a little wry. Second person. Short sentences.
- Specific over mystical: name the transit, name the feeling, suggest one action or reflection.
- Never: doom, shame, vague cold-reads, emoji soup, exclamation marks in readings.
- Reading length: headline ≤ 90 chars; body 60–140 words; journal prompt = one question ≤ 120 chars.

---

## 6. API contract (FastAPI)

```
POST /natal
  body: { name, date, time|null, lat, lng }
  → { chart: {...full placements, houses, big3}, chart_id }

GET /daily?user_id&date=YYYY-MM-DD
  → { headline, body, type: "COLLISION"|"TRANSIT"|"RIPPLE"|"WALKING",
      driver: { transit_planet, natal_planet|null, aspect|null, orb|null,
                sign|null, phase|null, house }, prompt, content_id }

POST /compat
  body: { chart_id_a, chart_id_b }
  → { big3_a, big3_b, insights: [ {title, body} ] }

GET /invite/{token}                       (Step 8.6; token-authenticated, no user auth)
  → { inviter_name, status: "pending"|"complete" }   404 if the token is unknown

POST /invite/{token}/submit               (Step 8.6; token-authenticated, no user auth)
  body: { name, date, time|null, lat, lng }   (same shape as /natal)
  → { big3, inviter_name }                    404 unknown · 409 already complete
  (computes the guest chart, completes the friends row via the service key,
   and sends the owner the "compatibility is ready" push)
```

All endpoints JSON, auth via Supabase JWT (Authorization: Bearer). Errors: `{ error: { code, message } }`.

---

## 7. Data model (new Supabase tables; existing content_* tables unchanged)

```
profiles      (id → auth.users, name, birth_date, birth_time, birth_place_label,
               lat, lng, tz_str, chart_json jsonb, push_token, notify_hour_local,
               last_push_date, created_at)
               -- tz_str: IANA zone from birth place (set at onboarding via /natal).
               -- notify_hour_local: default 8 (PRD 4.7 ~08:00 local).
               -- last_push_date: user's local YYYY-MM-DD of last successful daily
               --   push; stops the hourly cron from double-sending.
journal_entries (id, user_id, entry_date, text, transit_planet, natal_planet,
               aspect, intensity, phase, headline, body, content_id,
               created_at, updated_at)
               -- phase: New|Full|Retrograde|Direct|null, set on WALKING days
               --   only; powers the Journal tab's Full/New Moon filter.
               -- headline/body: snapshot of that day's reading text at save
               --   time, so later edits to content_* tables don't rewrite
               --   what the user actually saw/answered (shown in entry detail).
friends       (id, owner_id, guest_name, guest_chart_json jsonb, created_at,
               token, status, source)
               -- Step 8.6: guest_name / guest_chart_json are now NULLABLE — a
               --   'pending' invite row has no chart until the guest completes
               --   the web flow. token: DB-generated, the invite link's secret.
               --   status: 'pending'|'complete'. source: 'manual'|'invite'.
learn_progress (user_id, lesson_id, completed_at)
```

Row Level Security ON for all tables: users can only read/write their own rows.

---

## 8. Build phases (implement in this order)

1. ✅ Expo skeleton + 5 tabs (done / Step 1)
2. ✅ FastAPI wrapper: `/natal` + `/daily` around existing engine (done / Step 2 — CORS enabled for local web testing)
3. ✅ Onboarding flow → Supabase auth + profile + chart storage → Big 3 reveal (done / Step 3 — email-OTP sign-in, `profiles` upsert with `chart_json`, reveal screen)
4. ✅ Today screen (reading + Why + prompt + save entry) (done / Step 4 — `journal_entries` table + RLS added, Echo card deferred to Step 9 per build order)
5. ✅ Journal tab (list, filters, detail) (done / Step 5 — filter chips for planet/aspect/intensity/moon phase, entry detail with edit/delete + that day's reading snapshot; end-to-end tested in-browser, two bugs found and fixed: root layout's auth redirect didn't know about the `journal/[id]` stack route and bounced it back to Today, and Delete used `Alert.alert()`/`router.back()` which are no-ops/throw when there's no navigation history — replaced with an inline confirm + `router.canGoBack()` fallback)
6. ✅ Daily push pipeline (done / Step 6 — permission asked on Big 3 reveal; Expo push token + `tz_str`/`notify_hour_local`/`last_push_date` on profiles; `POST /cron/daily-push` on natal-api sends headline via Expo Push at ~08:00 local; tap deep-links to Today. **Live (Build Phase 11 / "Phase C"):** EAS `projectId` filled in, dev client rebuilt, and Railway hourly cron scheduled — see the two `FIXED` debt items below. End-to-end verified: a real push was received on-device via a manual trigger of the deployed `/cron/daily-push`.)
7. ✅ Learn Levels 1–2 (done / Step 7 — `LEVELS` catalog in `src/constants/lessons.ts`; Learn tab shows a level path + "% of your chart you can read" progress bar; lesson detail pulls the user's own placement from `profiles.chart_json` and the long-form reading from `content_natal` read directly with the authed session; `learn_progress` table + `content_natal` read RLS in `supabase/migrations/0003_learn.sql`; Levels 3–5 locked → Natal Plus via shared `PaywallSheet`. Level 2 ships **8** planet lessons (Mercury…Pluto), not the PRD's "7" — see debt.)
8. ✅ Connections (done / Step 8 — formerly "Friends"; user-facing rename in monetization pass. `friends` table + owner-only RLS in `supabase/migrations/0004_friends.sql`; Connections tab lists guest charts with their Big 3; add-Connection enters birth data via a shared `BirthDataForm` → `/natal` → stores `guest_chart_json`; comparison screen shows side-by-side Big 3 + 4 synastry-lite insights (Sun–Sun, Moon–Moon, Venus↔Mars both ways) from a new `POST /compat` on natal-api (`compat.py`, reuses the engine's degree/aspect math); shareable Big 3 card via the OS share sheet. Free cap = **1 Connection** (MONETIZATION.md); Plus raises to `MAX_FRIENDS` (20). End-to-end tested in-browser (add → compare → share → remove all pass); one bug found and fixed: the place-search list keyed on `display_name`, which Nominatim can return twice (duplicate-key warning) — fixed in the shared `BirthDataForm` and `onboarding.tsx`. **Deviations/debt below.**)
    - **Step 8.5 (watermarked share cards):** two story-sized (9:16) share cards with a built-in watermark — a **Big 3** card (Sun/Moon/Rising identity flex) and a **Today** card (headline + intensity badge). Render a normal React Native component off-screen, capture it to a crisp 1080×1920 PNG via `react-native-view-shot`, and open the native share sheet with `expo-sharing`. Full spec in **§8.5** below.
9. ✅ Echo feature (done / Step 9 — Today shows at most one past journal entry whose transit tag matches today's driver: exact match on transit_planet + natal_planet + aspect, falling back to transit_planet + aspect; never today's own entry. `findEcho` in `src/lib/echo.ts`, `EchoCard` on the Today tab with lead-in copy + excerpt + date + link to `journal/[id]`. No schema change — reuses existing `journal_entries` tags written at save time. **Monetization:** first Echo free; later Echoes blur with Unlock CTA for free users.)
10. Polish: My Chart list, App Store assets, EAS build + TestFlight
    - ✅ **Deploy the web build (Phase B).** `npx expo export --platform web` (static output, already configured via `app.config.ts` / formerly `app.json`'s `web.output: "static"`) deployed to a new Vercel project (`natal-app` — separate from the pre-existing `nataljournal.com` ecommerce site/project, which is untouched) with Git integration so pushes to `main` auto-deploy. `vercel.json` adds the static build/output config plus a rewrite (`/invite/:token` → the exported `/invite/[token]` route) since Expo Router's static export writes dynamic routes to a literal `[token]` filename that otherwise 404s on any real token. Custom domain `app.nataljournal.com` (DNS at Porkbun, `A` record → Vercel's `76.76.21.21`) points at it with an auto-issued TLS cert. `EXPO_PUBLIC_WEB_URL=https://app.nataljournal.com` is set in Vercel (build-time), the app's own `.env`, and Railway (`natal-api`'s CORS allow-list reads it). End-to-end verified: real invite created in the app → guest completed the form at `app.nataljournal.com/invite/<token>` → comparison appeared back in the app.
    - ✅ **Monetization / Natal Plus (Build Phase 10 paywall).** Authority: `MONETIZATION.md`. RevenueCat (`react-native-purchases`) configured via `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY` in `.env` → `app.config.ts` `extra`; `lib/subscription.ts` exposes `useIsPlus()` (entitlement `plus`); shared `components/PaywallSheet.tsx` with runtime price strings, Restore, and a clear dismiss ✕. Placements: Echo tease, one-time post–Big 3 soft paywall, contextual gates (Connection #2+, Learn 3+, transit calendar, pattern insights, chart interpretations). Analytics events fire with `source` (sink is `lib/analytics.ts` — console in `__DEV__` until a real provider is wired).

---

## 8a. Known engineering debt

- ~~**Wire up real cooldown tracking in `natal-api/engine.py`'s `compute_daily()`.**~~ **FIXED.** `_passes_cooldown()` now reads/writes a new `transit_cooldowns` table (`supabase/migrations/0006_transit_cooldowns.sql`: `user_id, collision_key, last_fired_date`, service-role-written only). `compute_daily()` takes optional `user_id`/`client` params — with a `user_id`, a `collision_key` still inside its `PLANET_COOLDOWNS` window is skipped, and whichever collision wins gets its `last_fired_date` recorded via `_record_fired()`. Without a `user_id` (e.g. no history to check) it behaves exactly as before, so nothing broke for callers that don't have one. Both real callers now pass a `user_id`: `POST /daily` (new optional `user_id` on `DailyRequest`, sent by the app's `fetchDaily()` using the signed-in user's id) and the daily-push cron (`push.py`'s `compute_headline()`, using the profile's `id` and the cron's already-open client so it isn't a second connection per profile). Smoke-tested with a fake in-memory Supabase client: an aspect that fires on day 1 is correctly suppressed if recomputed within its cooldown window, and the next-highest-priority aspect (or WALKING, once nothing survives) takes over.
- ~~**Dev-only auth bypass in `src/app/sign-in.tsx` (`devBypass`, gated by `__DEV__`) and a matching `[dev] Sign out` button on the Today tab.**~~ **FIXED (Build Phase 10 pre-ship cleanup).** Removed `devBypass()` and its button entirely from `sign-in.tsx` — real sign-in is email-OTP only now. The Today tab's sign-out button stays (it's the only sign-out control in the app — there's no Settings screen yet) but is no longer `__DEV__`-gated or labeled `[dev]`; it's now a normal, permanent "Sign out". **Action still needed in the Supabase dashboard** (not code): turn "Confirm email" back on for the Email provider (Authentication → Providers → Email) — it was switched off only to make the now-removed bypass work.
- ~~**`journal_entries` table lives in `supabase/migrations/0001_journal_entries.sql` but isn't applied automatically** — no Supabase CLI project is linked in this repo yet.~~ **FIXED.** Ran `supabase init` + `supabase link --project-ref dwowzsmodoekidixvhrf` (the "Natal" project already existed and the CLI was already authenticated) — `supabase/config.toml` now tracks the link locally (gitignored, alongside `.temp/`, like the access token). `supabase migration list --linked` showed none of 0001–0006 recorded as applied remotely even though their tables/policies already existed (someone had been pasting them into the Dashboard SQL editor by hand, per this section's older notes) — checked `information_schema.columns`/`pg_policies` directly rather than blindly running `db push` (which would've errored on the bare, non-`IF NOT EXISTS` `CREATE POLICY` statements in 0001/0003 hitting policies that already existed) and found real drift: `profiles` was missing `tz_str` and `last_push_date` (0002 had only partially landed — `push_token`/`notify_hour_local` existed but not those two), which would silently crash the daily-push cron's `_local_now(row['tz_str'])` and the same-day dedup check the first time it ran. Applied the two missing columns directly, then `supabase migration repair --status applied 0001 0002 0003 0004 0005 0006 --linked` to sync history without re-running already-applied SQL. `supabase db push` now works cleanly for any *new* migration going forward — no more pasting into the Dashboard by hand.
- ~~**`npm run lint` had never actually been run with a real config** — `eslint.config.js` didn't exist, so `expo lint` had nothing to check against despite being a documented command.~~ **FIXED.** Running it for the first time auto-installed `eslint` + `eslint-config-expo` and generated `eslint.config.js` (standard `expo lint` first-run behavior), which then surfaced real pre-existing issues across the app: 3 `react-hooks/set-state-in-effect` errors (`_layout.tsx`'s profile-check effect now resets `hasProfile` where `session` itself is cleared, inside the same auth callback, instead of a separate effect reacting to `session` — fixes a real staleness bug where a previous user's `hasProfile=true` could survive into the next sign-in; `learn/[id].tsx`'s `!found` branch already short-circuits before the `loading` check in render, so its `setLoading(false)` was dead code and just got removed; `echo-card.tsx`'s redundant `setLoading(true)` likewise removed since the initial `useState(true)` already covers first mount and its props don't change again mid-session), 2 `react/no-unescaped-entities` errors (stray `'` in `journal-prompt.tsx` / `journal/[id].tsx`, now `&apos;`), and 2 warnings from a component sharing its name with its own exported type (`JournalFilters` the component renamed to `JournalFilterBar` — `JournalFilters` the type is unchanged). `npm run lint` is clean (0 errors; 4 pre-existing `exhaustive-deps` warnings left as intentional, already explained by comments in `_layout.tsx`/`learn/[id].tsx`/`echo-card.tsx`).
- **The Why? mini-lesson text (`src/constants/astro.ts`'s `ASPECT_LESSONS`) is a hardcoded, planet-agnostic paragraph per aspect type, not pulled from a content table.** It's a placeholder until the Learn content (Build Phase 7, `content_natal`) exists — revisit then to see if aspect-lesson copy should move into Supabase alongside it for consistency/editability.
- **Today's `/daily` call sends raw birth data (name/date/time/lat/lng) on every request _alongside_ a `user_id`** (added to unblock the cooldown-tracking fix above), rather than the PRD §6 contract of `GET /daily?user_id&date` alone. Fine for MVP since the app already has the birth data locally and building the natal subject still needs it; revisit if/when charts are persisted server-side and `/daily` can become a pure `user_id` lookup.
- ~~**EAS `projectId` is empty in `app.json` → `extra.eas.projectId`.**~~ **FIXED.** `eas init` created and linked the `@ndame/natal-app` EAS project (`app.json`'s `extra.eas.projectId` + `owner` now filled in; `eas.json` added with `development`/`preview`/`production` build profiles). Rebuilding the iOS dev client (`eas build --profile development --platform ios`) initially failed in the Install dependencies phase — `package-lock.json` was out of sync with `package.json` (`expo-dev-client` had been added without a matching `npm install`), and separately, regenerating the lockfile with local npm (11.6.2) produced a shape npm 10.9.8 — the version EAS's macOS build image actually runs — rejected under `npm ci`'s stricter sync check. Fixed by doing a clean reinstall (`rm -rf node_modules package-lock.json && npx npm@10.9.8 install`) so the committed lockfile matches the exact npm version EAS builds with. Build succeeded after that; the rebuilt dev client registered a real `profiles.push_token` on next launch.
- ~~**`POST /cron/daily-push` is implemented but not scheduled.**~~ **FIXED.** Added a `daily-push-cron` service in the same Railway project as `natal-app` (`skillful-delight`), on the `5 * * * *` schedule (hourly at :05, evaluated in UTC), calling `curl -sf -X POST -H "Authorization: Bearer $CRON_SECRET" "$TARGET_URL"` against the deployed `/cron/daily-push`; `CRON_SECRET` is a Railway variable reference to `natal-app`'s existing value (`${{natal-app.CRON_SECRET}}`) rather than a duplicated secret. First attempt used the `curlimages/curl` image, whose fixed `ENTRYPOINT ["curl"]` silently breaks a custom start command that also begins with `curl` (Railway appends the command as args to the entrypoint instead of replacing it) — the deploy crashed with no useful log output. Switched the image to plain `alpine:3.20` (no conflicting entrypoint) with a start command that installs curl at runtime and runs the call through an explicit `sh -c` so `$CRON_SECRET`/`$TARGET_URL` actually expand. Verified end-to-end with a manual call to the deployed endpoint (bypassing the schedule for immediate testing): `{"due":1,"sent":1,"skipped":0,"errors":[]}`, and the push was received on-device.
- ~~**natal-api `.env` still uses the publishable/anon key as `SUPABASE_SERVICE_KEY`.**~~ **STALE — already fixed.** Decoded the JWT in `natal-api/.env`: its payload is `{"role":"service_role", ...}`, i.e. it's already the real service-role key, not anon. Nothing to change; `.env` stays gitignored either way.
- ~~**`supabase/migrations/0003_learn.sql` isn't applied automatically**~~ **FIXED** — tracked and confirmed applied by the CLI-linking fix above. It enables RLS on `content_natal` with a read-only policy for `authenticated`; if any anon-key reader ever needs it, widen the policy to `anon` too (there's already a separate pre-existing `anon can read content_natal` policy on the table, so this is likely moot). The natal-api engine uses the service key and bypasses RLS, so `/daily` is unaffected.
- **Level 2 "Your Planets" ships 8 lessons (Mercury…Pluto), not the PRD §4.4 "7 lessons".** Chosen so every planet placement is covered and "% of your chart you can read" can reach 100% — leaving Pluto permanently unreadable in the free tier felt wrong. To match the literal spec, delete the `planet-pluto` entry from `src/constants/lessons.ts` (catalog is plain data, one-line change).
- ~~**Friends "add" is owner-entered, not the PRD §4.5 "share link → recipient enters birth data (no account)" flow.**~~ **SUPERSEDED by Step 8.6.** The token-based invite link + staged web reveal is now built: pending `friends` rows carry a DB token, the guest completes an unauthenticated write via natal-api's service-key `POST /invite/{token}/submit`, and the guest page (`src/app/invite/[token].tsx`) runs on web. The only remaining dependency — a deployed web URL for the links — moves to Build Phase 10 (see the `EXPO_PUBLIC_WEB_URL` item below).
- **`POST /compat` takes the two `chart_json` objects, not `{chart_id_a, chart_id_b}` per PRD §6.** Same reason as `/daily`: the API has no server-side chart store, and the app already holds both charts (owner profile + friend `guest_chart_json`). Revisit if/when charts get persisted server-side. Synastry orb is a fixed 8° and insight copy is templated per (pairing, aspect) in `natal-api/compat.py` — move to a content table if it should be editable without a deploy.
- ~~**Friends "Share this card" shares text via the OS share sheet, not a rendered PNG.**~~ **FIXED.** `Big3CompareCard` now takes a `forwardRef` (+ `collapsable={false}`) so it can be captured in place — no off-screen clone needed since it's already on-screen. `useShareCard()` (Step 8.5) gained an optional `size` param: `null` skips the forced 1080×1920 resize used for the story-format `ShareCard` and captures the compare card at its own natural dimensions instead, since its layout isn't 9:16 and forcing that ratio via `captureRef`'s width/height would stretch it (confirmed via the view-shot docs: those options *resize* the capture, they don't crop/letterbox). `friends/[id].tsx`'s share button now calls the hook on native and keeps the original text/clipboard path on web (still true that capture is unreliable there). Still needs the dev-client rebuild noted below to actually exercise `react-native-view-shot` on a device — untested past a type-check since there's no device attached to this session.
- ~~**`supabase/migrations/0004_friends.sql` isn't applied automatically**~~ **FIXED** — tracked and confirmed applied by the CLI-linking fix above.
- ~~**Free-tier friend cap (3) is enforced but there's no upsell/paywall path**~~ **FIXED → SUPERSEDED by Natal Plus (MONETIZATION.md).** Free cap is now **1 Connection**; invite/add at limit opens shared `PaywallSheet` (`source="connection_limit"`). Plus users get up to `MAX_FRIENDS` (20). RevenueCat entitlement `plus` via `useIsPlus()`. Legacy `/learn/paywall` route is a shim that opens the same sheet.
- **Analytics provider not wired yet.** `lib/analytics.ts` `track()` logs in `__DEV__` only. Paywall fires `paywall_shown` / `paywall_dismissed` / `trial_started` / `purchase_completed` with `source` — swap the sink for PostHog/Amplitude (etc.) before App Store launch.
- ~~**Invite links point at `EXPO_PUBLIC_WEB_URL` (Step 8.6), which defaults to `http://localhost:8081` until the web build is deployed.**~~ **FIXED (Build Phase 10, Phase B).** `EXPO_PUBLIC_WEB_URL` is now `https://app.nataljournal.com` (Vercel-hosted web export; see the Build Phase 10 entry above) everywhere it's read: the app's `.env`, Vercel's build-time env, and Railway's `natal-api` env (for the CORS allow-list). Real invite links now resolve for a guest on any device. `src/constants/links.ts` still holds `APP_STORE_URL` (empty) and `TESTFLIGHT_MODE` (true → the guest's locked screen shows early-access copy instead of a dead store link) — those remain open until App Store submission. (`supabase/migrations/0005_friend_invites.sql` is confirmed applied — see the CLI-linking fix above.) The two `/invite/{token}` routes were already built and smoke-tested in `natal-api/main.py` (13-check backend E2E: landing → submit → 409 → complete, DB row + Big 3 verified); Phase B additionally end-to-end tested the real deployed path (app → real invite → guest completes on `app.nataljournal.com` → comparison shows up back in the app).
- **Rising lesson maps to `content_natal` rows keyed `planet='Ascendant'`, `house=1`** — matching the reference `journal_generator.py` (`get_natal_content(client, "Ascendant", asc_sign, 1)`), so those rows exist. Any placement with no matching `content_natal` row (a gap in the table) degrades gracefully to the planet-agnostic intro + a "deeper reading coming soon" line rather than erroring.

---

## 8.5 — Watermarked Share Cards (Cursor-Ready)

**Goal:** two beautiful, story-sized (9:16) share cards, each with a built-in watermark:
1. **Big 3 card** — Sun / Moon / Rising (the identity flex — this is the one people will post)
2. **Today card** — today's headline + intensity badge

Tapping "Share" renders the card as an image and opens the phone's native share sheet (Instagram, iMessage, save to photos — the OS handles all destinations).

**Time estimate:** 1–2 hours.

**How it works (the one concept in this step):** we don't "generate an image" with a graphics library. We build the card as a normal React Native component — same Views and Texts you've used everywhere — render it invisibly off-screen, then use `react-native-view-shot` to **screenshot that component** into a PNG. Design in code, ship as pixels.

**Web caveat:** component-to-image capture is unreliable in the browser. Build this step, but test it on your dev build / device (you have one from Step 6's push work). On web, the share button can no-op with a console note.

> **Note (supersedes part of §8a debt):** this step is the earlier pull-in of the `react-native-view-shot` + `expo-sharing` work that the Friends "Share this card" debt item deferred to Build Phase 10. Once shipped, the Friends Big 3 compare card can reuse the same `useShareCard` hook to share a rendered PNG instead of text.

---

### 8.5A. Install

In `natal-app`:

```bash
npx expo install react-native-view-shot expo-sharing
```

- **react-native-view-shot** — screenshots a component into an image file
- **expo-sharing** — opens the native share sheet with that file

---

### 8.5B. The card component

One component, two variants. It renders at 360×640 logical points; the hook (§8.5C) captures it at a fixed **1080×1920** output → a crisp, device-independent story-sized PNG.

**Create:** `src/components/share-card.tsx` (kebab-case + under `src/`, matching the repo — e.g. `big3-compare-card.tsx`)

```tsx
// The shareable card. This is a NORMAL presentational component — we just
// position it off-screen and photograph it. Change the design here, the
// image changes. Signs arrive already-expanded ("Gemini"); expand at the
// call site with expandSign() from @/constants/astro.
import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { badgeLabel, BADGE_COLORS } from '@/constants/astro';
import type { DailyReading } from '@/lib/api';

// ---- Types for the two card variants ----
export type Big3CardData = {
  variant: 'big3';
  name: string;
  sun: string;     // already pretty-printed, e.g. "Gemini"
  moon: string;
  rising: string;
  risingApprox?: boolean; // birth time unknown
};

export type TodayCardData = {
  variant: 'today';
  headline: string;
  intensity: DailyReading['type']; // 'COLLISION' | 'TRANSIT' | 'RIPPLE' | 'WALKING'
  dateLabel: string; // e.g. "Thursday, July 9"
};

type Props = { data: Big3CardData | TodayCardData };

// forwardRef lets the parent hand us a ref that view-shot can photograph.
const ShareCard = forwardRef<View, Props>(({ data }, ref) => {
  return (
    // collapsable={false} stops Android from optimizing this View away
    // before the screenshot happens.
    <View ref={ref} collapsable={false} style={styles.card}>
      {/* Decorative star field — cheap texture with absolutely-positioned dots */}
      {STARS.map((s, i) => (
        <View key={i} style={[styles.star, { top: s.top, left: s.left, opacity: s.o }]} />
      ))}

      {data.variant === 'big3' ? (
        <View style={styles.body}>
          <Text style={styles.eyebrow}>{data.name.toUpperCase()}’S BIG 3</Text>
          <Big3Row label="Sun" sign={data.sun} line="the engine" />
          <Big3Row label="Moon" sign={data.moon} line="the weather" />
          <Big3Row
            label="Rising"
            sign={data.rising}
            line={data.risingApprox ? 'the doorway (approx.)' : 'the doorway'}
          />
        </View>
      ) : (
        <View style={styles.body}>
          <Text style={styles.eyebrow}>{data.dateLabel.toUpperCase()}</Text>
          {/* Same label + colors the app's other badges use (WALKING shows
              as "TODAY"), from @/constants/astro. */}
          <View style={[styles.badge, { borderColor: BADGE_COLORS[data.intensity] }]}>
            <Text style={[styles.badgeText, { color: BADGE_COLORS[data.intensity] }]}>
              {badgeLabel(data.intensity)}
            </Text>
          </View>
          <Text style={styles.headline}>{data.headline}</Text>
        </View>
      )}

      {/* THE WATERMARK — styled as the card's signature, not a stamp.
          Swap the URL for the App Store link once it exists. */}
      <View style={styles.watermark}>
        <Text style={styles.wordmark}>NATAL</Text>
        <Text style={styles.url}>nataljournal.com</Text>
      </View>
    </View>
  );
});

ShareCard.displayName = 'ShareCard';

function Big3Row({ label, sign, line }: { label: string; sign: string; line: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowSign}>{sign}</Text>
      <Text style={styles.rowLine}>{line}</Text>
    </View>
  );
}

// Fixed "random" star positions — hardcoded so every card renders identically.
const STARS = [
  { top: 40, left: 30, o: 0.5 }, { top: 90, left: 300, o: 0.3 },
  { top: 150, left: 120, o: 0.4 }, { top: 210, left: 330, o: 0.5 },
  { top: 480, left: 40, o: 0.3 }, { top: 520, left: 280, o: 0.45 },
  { top: 570, left: 150, o: 0.35 }, { top: 60, left: 200, o: 0.25 },
];

const styles = StyleSheet.create({
  card: {
    width: 360,
    height: 640,               // 9:16 — story format
    backgroundColor: colors.bg,
    borderRadius: 0,           // stories are full-bleed; no rounding
    padding: 32,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  star: {
    position: 'absolute', width: 3, height: 3, borderRadius: 2,
    backgroundColor: colors.text,
  },
  body: { flex: 1, justifyContent: 'center' },
  eyebrow: {
    color: colors.muted, letterSpacing: 4, fontSize: 12,
    textAlign: 'center', marginBottom: 28,
  },
  row: { alignItems: 'center', marginBottom: 26 },
  rowLabel: { color: colors.muted, fontSize: 13 },
  rowSign: { color: colors.text, fontSize: 34, fontWeight: '700', marginVertical: 2 },
  rowLine: { color: colors.accent, fontSize: 13 },
  // borderColor + text color are set inline from BADGE_COLORS per intensity.
  badge: {
    alignSelf: 'center', borderWidth: 1,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 22,
  },
  badgeText: { fontSize: 11, letterSpacing: 2 },
  headline: {
    color: colors.text, fontSize: 26, fontWeight: '600',
    textAlign: 'center', lineHeight: 36,
  },
  watermark: { alignItems: 'center' },
  wordmark: { color: colors.text, letterSpacing: 6, fontSize: 14, fontWeight: '700' },
  url: { color: colors.muted, fontSize: 11, marginTop: 4 },
});

export default ShareCard;
```

---

### 8.5C. The share hook

One reusable hook: photograph the ref → open the share sheet.

**Create:** `src/lib/use-share-card.ts`

```ts
// Reusable share logic: capture a component ref as a PNG, open the share sheet.
import { useRef, useState } from 'react';
import { PixelRatio, Platform, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

// Story format. captureRef's width/height are LOGICAL points, so divide the
// target PHYSICAL pixels by PixelRatio.get() to land on a consistent
// 1080×1920 file on every device. (The older `pixelRatio` option is
// undocumented and device-dependent — use width/height per the Expo docs.)
const TARGET_W = 1080;
const TARGET_H = 1920;

export function useShareCard() {
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  async function share() {
    if (Platform.OS === 'web') {
      console.log('Share cards: test on device — capture is unreliable on web.');
      return;
    }
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const pr = PixelRatio.get();
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: TARGET_W / pr,
        height: TARGET_H / pr,
      });
      // Some simulators report false here — test the sheet on a real device.
      if (!(await Sharing.isAvailableAsync())) {
        console.log('Sharing not available on this device.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your card',
      });
      // TODO (analytics): log a "share_completed" event here with the card
      // variant — the data that settles the share vs. compare growth bet.
    } finally {
      setSharing(false);
    }
  }

  return { cardRef, share, sharing };
}
```

---

### 8.5D. Wire it into the screens

The pattern — the card sits in the tree but **off-screen** (parked 9999px left), so it's fully laid out and photographable without ever being visible. Expand sign codes with the existing `expandSign()` from `@/constants/astro` (the same helper `reveal.tsx` and `big3-compare-card.tsx` already use — no new `pretty()`/`format.ts` needed).

**Big 3 card → `src/app/reveal.tsx`.** The Big 3 payoff screen already fetches `chart_json.big3` + `birth_time`, so it's the natural home today. (The same card should also land on the **My Chart** tab, but `src/app/(tabs)/chart.tsx` is still a `PlaceholderScreen` — that tab is Build Phase 10.) Additions only:

```tsx
import ShareCard from '@/components/share-card';
import { useShareCard } from '@/lib/use-share-card';
import { expandSign } from '@/constants/astro';

// Widen the existing profile fetch to include `name`, and keep it in state:
//   .select('name, chart_json, birth_time')
const [name, setName] = useState('');
// ...inside that same .then(): setName(data?.name ?? '');

// In the component body (big3 + timeKnown already exist here):
const { cardRef, share, sharing } = useShareCard();

// In the JSX, e.g. above the "See today’s sky" button:
<Pressable style={styles.shareButton} onPress={share} disabled={sharing}>
  <Text style={styles.shareButtonText}>
    {sharing ? 'Preparing…' : 'Share my Big 3'}
  </Text>
</Pressable>

{/* Off-screen render target — fully laid out but parked far off-screen. */}
<View style={{ position: 'absolute', left: -9999 }}>
  <ShareCard
    ref={cardRef}
    data={{
      variant: 'big3',
      name,
      sun: expandSign(big3.sun),
      moon: expandSign(big3.moon),
      rising: expandSign(big3.rising),
      risingApprox: !timeKnown,
    }}
  />
</View>
```

**Today card → `src/app/(tabs)/index.tsx`.** The Today tab already holds `reading: DailyReading` and the formatted `headerDate`. Additions only, inside the existing `reading && userId` block:

```tsx
import ShareCard from '@/components/share-card';
import { useShareCard } from '@/lib/use-share-card';

// In the component body:
const { cardRef, share, sharing } = useShareCard();

// After <JournalPrompt /> inside the `reading && userId` fragment:
<Pressable style={styles.shareButton} onPress={share} disabled={sharing}>
  <Text style={styles.shareButtonText}>
    {sharing ? 'Preparing…' : 'Share today'}
  </Text>
</Pressable>

<View style={{ position: 'absolute', left: -9999 }}>
  <ShareCard
    ref={cardRef}
    data={{
      variant: 'today',
      headline: reading.headline ?? 'Today',
      intensity: reading.type,
      dateLabel: headerDate,
    }}
  />
</View>
```

Add the button styles to each screen's `StyleSheet` (mirrors the Friends `shareBtn` in `friends/[id].tsx`):

```tsx
shareButton: {
  backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accent,
  borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16,
},
shareButtonText: { color: colors.accent, fontWeight: '600', fontSize: 15 },
```

---

### ✅ Done when (on your dev build / device):

- [ ] "Share my Big 3" opens the native share sheet with a crisp 1080×1920 card
- [ ] Watermark reads NATAL / nataljournal.com and looks like part of the design
- [ ] Saving to Photos and posting to an IG story both look right (text not clipped, full-bleed)
- [ ] Today card shows headline + intensity badge correctly
- [ ] Unknown-birth-time users see "(approx.)" on Rising

### If something breaks:

- **Captured image is blank/black (Android)** → make sure `collapsable={false}` is on the card's root View and the card has an explicit backgroundColor.
- **Card looks cut off** → the off-screen wrapper must not constrain size; keep it exactly `position: 'absolute', left: -9999` with no width/height.
- **Share sheet doesn't open** → `Sharing.isAvailableAsync()` is false on some simulators; test on a real device.
- **Blurry / wrong-size output** → confirm `width`/`height` (target ÷ `PixelRatio.get()`) made it into the `captureRef` options, and that the card had finished layout before capture (it will, once it's mounted off-screen in the tree).

---

**Growth-lever scorecard (revisit in ~4 weeks):**
- Share cards → count share_completed by variant
- Compare links → count link_sent / guest_chart_completed / guest_signup

Whichever converts, feed it. If Big 3 cards dominate, add more card variants (journal-streak card, Echo card). If compare links convert better, make "Compare with someone" more prominent on Today.

---

## 8.6 — Invite Links, Staged Reveal & Friends Tab Redesign (Cursor-Ready)

**Goal:** turn Friends into a growth loop. The owner sends a link; the guest gets their *own* Big 3 as the gift and hits a gate on the *comparison*; the owner gets a push and lands on the comparison. Supersedes the §8a "share-link flow" debt item.

**The loop:**
1. Owner taps **Invite** → a `friends` row is created with `status='pending'` and a DB-generated `token` → native share sheet with the link.
2. Guest opens `/invite/<token>` on the web: "✦ [Name] wants to compare charts with you."
3. Guest enters their own birth data (reusing `birth-data-form`) → **sees their own Big 3** (the gift).
4. Gate: "Your compatibility with [Name] is ready" (TestFlight-safe copy behind `TESTFLIGHT_MODE`).
5. Owner gets a push → taps → lands on `/friends/<id>` via the existing `data.url` deep-link handler.

**Why a token, not `?to=<owner_id>`:** a token is per-invite, so pending/complete status, "already used" handling, and nothing guessable in the URL. One invite = one row = one link. **No new native modules** — link sharing uses RN's built-in `Share`; the token comes from Postgres. Works in the current dev client and on web (no rebuild).

**What shipped:**
- **`supabase/migrations/0005_friend_invites.sql`** — drops NOT NULL on `guest_name`/`guest_chart_json`; adds `token` (unique, `gen_random_uuid()` default), `status` ('pending'|'complete'), `source` ('manual'|'invite'). No RLS changes (owner inserts pending rows; the guest never touches Supabase).
- **natal-api** (now in-repo under `natal-api/`) — `GET /invite/{token}` and `POST /invite/{token}/submit` (token-authenticated, no user auth), reusing `make_subject` + `serialize_chart` and a new reusable `send_push()` helper extracted from the `/cron/daily-push` path. Submit completes the row and pushes the owner. Backend verified with a 13-check E2E smoke test (landing → submit → 409 → complete).
- **App types + data:** `src/types/friend.ts` made pending-aware (nullable `guest_name`/`guest_chart_json`); `createInvite()` in `src/lib/friends.ts`; `fetchInviteInfo` / `submitInvite` in `src/lib/api.ts`; `src/constants/links.ts` (`WEB_URL`, `APP_STORE_URL`, `TESTFLIGHT_MODE`).
- **Guest page** `src/app/invite/[token].tsx` — four-phase state machine (`landing → form → reveal → locked`), plus root-layout guard exemptions (`!session` branch skips `invite`; `invite` added to `ALLOWED_STACK_SEGMENTS`; `<Stack.Screen name="invite/[token]" />`). Big 3 cards extracted to shared `src/components/big3-cards.tsx` (reused by `reveal.tsx`).
- **Connections tab redesign** `src/app/(tabs)/friends.tsx` — primary "✦ Invite someone to compare" CTA + quiet "Add their details manually" link; a WAITING section (pending rows, Resend + delete) above the existing COMPARED rows; pending + complete both count toward `FREE_CONNECTION_LIMIT` (1).

**Design rule enforced:** gift before gate. The guest's own Big 3 is unconditional; only the *comparison* is locked.

---

## 9. Non-goals for MVP (do not build; say no if asked)

- Tarot, Vedic/sidereal mode, human astrologer chat, dating features
- Social feed, comments, public profiles, journal sharing
- Android release, iPad layout, widgets, Apple Watch
- Full synastry wheels, progressions, solar returns
- LLM-generated readings (content tables only in MVP)

---

## 10. Success metrics

- Activation: ≥70% of signups reach Big 3 reveal; ≥50% accept notifications.
- Retention (the Pincus metric): D30 ≥ 20%, push open rate ≥ 15%.
- New-bet signal: ≥25% of D7-retained users have written ≥1 journal entry; any organic mention of the Echo feature = signal to double down.

---

## 11. Engineering conventions (Cursor: always follow)

- TypeScript everywhere in the app; no `any` unless unavoidable.
- Expo Router file-based navigation; screens in `src/app/`, shared UI in `src/components/`, API calls in `lib/api.ts`, Supabase client in `lib/supabase.ts`, subscription gating in `lib/subscription.ts` (`useIsPlus()` only — no scattered premium flags), analytics via `lib/analytics.ts` `track()`, types in `types/`.
- Pricing / paywall / tier decisions: **`MONETIZATION.md` is authoritative** (wins over older PRD notes if they conflict).
- Colors via a single `constants/theme.ts` — no hardcoded hex in components. (Shipped palette is cream/ink/slate — see `theme.ts`; older purple tokens in this section are stale.)
- Keep components small (<150 lines); extract when bigger.
- Every API call handles loading + error states visibly.
- Explain non-obvious code with brief comments (founder is learning).
- Never store secrets in the repo; use `.env` + `app.config.ts`.
