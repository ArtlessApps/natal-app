# PRD — Natal (working title)
### A natal-chart companion app that learns from your life

**Version:** 1.0 (MVP) · **Platform:** iOS first (via React Native + Expo), Android later · **Author:** Founder + Claude · **Status:** In development

> **How to use this doc in Cursor:** keep this file at the project root as `PRD.md`. When asking Cursor to build a feature, reference it with `@PRD.md` so every generation follows the same product decisions, data model, and conventions.

---

## 1. Product summary

Natal is a mobile astrology app built on the "Proven, Better, New" framework:

- **Proven (copy what works — Co-Star's core):** instant free natal chart from birth data, one personalized daily push notification driven by real transits, friend chart comparison, a strong editorial voice, generous free tier.
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
- Free tier: Levels 1–2. Paid: Levels 3–5 (paywall stub in MVP; purchases wired in Phase 2 with RevenueCat).

### 4.5 Friends (tab)
- Add friend via share link. Recipient enters birth data (guest chart, no account required).
- Comparison view: side-by-side Big 3 + 3–4 compatibility insights (server-computed synastry-lite: Sun–Sun, Moon–Moon, Venus–Mars aspects using existing aspect code).
- Shareable image card (Big 3 comparison) for social distribution.
- Free tier: 3 friends. MVP cap: friends list max 20.

### 4.6 My Chart (tab)
- Chart wheel (MVP: a clean placement LIST grouped by planet with sign/house/degree is acceptable; wheel graphic is Phase 2).
- Every placement row taps through to its Learn lesson / `content_natal` entry.

### 4.7 Push notification (daily)
- One per user per day, ~08:00 local time.
- Text = Today headline. Deep-links to Today tab.
- Tone rule (hard requirement): direct and specific, never doom-flavored. Banned vibes: fatalism, "you are avoiding something"-style vague accusations, anything that reads as a horoscope-shaped insult.

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
friends       (id, owner_id, guest_name, guest_chart_json jsonb, created_at)
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
6. ✅ Daily push pipeline (done / Step 6 — permission asked on Big 3 reveal; Expo push token + `tz_str`/`notify_hour_local`/`last_push_date` on profiles; `POST /cron/daily-push` on natal-api sends headline via Expo Push at ~08:00 local; tap deep-links to Today. Needs EAS `projectId` + `CRON_SECRET` + hourly scheduler to go live.)
7. ✅ Learn Levels 1–2 (done / Step 7 — `LEVELS` catalog in `src/constants/lessons.ts`; Learn tab shows a level path + "% of your chart you can read" progress bar; lesson detail pulls the user's own placement from `profiles.chart_json` and the long-form reading from `content_natal` read directly with the authed session; `learn_progress` table + `content_natal` read RLS in `supabase/migrations/0003_learn.sql`; Levels 3–5 locked → paywall stub at `learn/paywall`. Level 2 ships **8** planet lessons (Mercury…Pluto), not the PRD's "7" — see debt.)
8. Friends (link, guest chart, comparison, share card)
9. Echo feature (transit-matched past entries on Today)
10. Polish: My Chart list, paywall stub, App Store assets, EAS build + TestFlight

---

## 8a. Known engineering debt

- **Wire up real cooldown tracking in `natal-api/engine.py`'s `compute_daily()`.** Right now `_passes_cooldown()` is a no-op (always returns `True`) because a single `/daily` request has no cross-day history to check against. The original `journal_generator.py` enforces per-planet cooldowns (`PLANET_COOLDOWNS`) across its 365-day loop to stop the same aspect firing again too soon. Without that, WALKING essentially never triggers for a real chart — Moon moves fast with a generous 3° orb, so *something* is almost always in range across 10 natal planets, and nothing here ever suppresses it. Fix once per-user "last fired" state exists (naturally lands with Build Phase 3's profile/journal storage): persist `collision_key → last_fired_date` per user in Supabase, look it up in `_passes_cooldown()`, and delete the TODO.
- **Dev-only auth bypass in `src/app/sign-in.tsx` (`devBypass`, gated by `__DEV__`) and a matching `[dev] Sign out` button on the Today tab.** Added because Supabase's built-in email sender rate-limits OTP sends hard, which made it impossible to iterate on post-auth screens. Bypass signs in/up with a fixed test email+password instead of emailing a code — only works while the Email provider's "Confirm email" setting is turned off in the Supabase dashboard. Both must be removed (and "Confirm email" turned back on) before shipping; also revisit once custom SMTP (Resend/SendGrid/etc.) is wired up, which removes the rate-limit problem at the root.
- **`journal_entries` table lives in `supabase/migrations/0001_journal_entries.sql` but isn't applied automatically** — no Supabase CLI project is linked in this repo yet, so it has to be pasted into the Dashboard SQL editor by hand (the file is safe to re-run: `create table if not exists` + `add column if not exists`). Wire up `supabase link` + `supabase db push` (or equivalent CI step) before adding more tables, so migrations stay tracked in git and applied consistently.
- **The Why? mini-lesson text (`src/constants/astro.ts`'s `ASPECT_LESSONS`) is a hardcoded, planet-agnostic paragraph per aspect type, not pulled from a content table.** It's a placeholder until the Learn content (Build Phase 7, `content_natal`) exists — revisit then to see if aspect-lesson copy should move into Supabase alongside it for consistency/editability.
- **Today's `/daily` call sends raw birth data (name/date/time/lat/lng) on every request instead of a `user_id`,** matching `natal-api`'s current `DailyRequest` shape rather than the PRD §6 contract (`GET /daily?user_id&date`). Fine for MVP since the app already has the birth data locally, but revisit if `/daily` needs to become the source of truth for cooldown state (see the cooldown-tracking debt item above) — that needs a real `user_id` on the request either way.
- **EAS `projectId` is empty in `app.json` → `extra.eas.projectId`.** `getExpoPushTokenAsync` needs a real EAS project; until `eas init` / `eas build:configure` fills this in, reveal still asks for permission but skips token storage (and the cron has nothing to send to). Fill the id, rebuild a dev client (Expo Go on Android SDK 53+ can't receive remote pushes), and re-open the app so the root-layout token refresh writes `profiles.push_token`.
- **`POST /cron/daily-push` is implemented but not scheduled.** Set `CRON_SECRET` in `natal-api/.env`, then point an hourly scheduler at it (`curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://…/cron/daily-push`). System cron, a Railway/Fly cron, or a Supabase `pg_cron` + `net.http_post` all work — pick one at deploy time. Also run `supabase/migrations/0002_profiles_push.sql` in the Dashboard so the new profile columns exist.
- **natal-api `.env` still uses the publishable/anon key as `SUPABASE_SERVICE_KEY`.** The cron updates `last_push_date` / clears dead tokens with the service client; if RLS blocks those writes, swap in the real service-role key from the Supabase dashboard (Project Settings → API). Don't commit it.
- **`supabase/migrations/0003_learn.sql` (Learn: `learn_progress` table + `content_natal` read RLS) isn't applied automatically** — same unlinked-CLI issue as 0001/0002, paste it into the Dashboard SQL editor (safe to re-run). It enables RLS on `content_natal` with a read-only policy for `authenticated`; if any anon-key reader ever needs it, widen the policy to `anon` too. The natal-api engine uses the service key and bypasses RLS, so `/daily` is unaffected.
- **Level 2 "Your Planets" ships 8 lessons (Mercury…Pluto), not the PRD §4.4 "7 lessons".** Chosen so every planet placement is covered and "% of your chart you can read" can reach 100% — leaving Pluto permanently unreadable in the free tier felt wrong. To match the literal spec, delete the `planet-pluto` entry from `src/constants/lessons.ts` (catalog is plain data, one-line change).
- **Rising lesson maps to `content_natal` rows keyed `planet='Ascendant'`, `house=1`** — matching the reference `journal_generator.py` (`get_natal_content(client, "Ascendant", asc_sign, 1)`), so those rows exist. Any placement with no matching `content_natal` row (a gap in the table) degrades gracefully to the planet-agnostic intro + a "deeper reading coming soon" line rather than erroring.

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
- Expo Router file-based navigation; screens in `app/`, shared UI in `components/`, API calls in `lib/api.ts`, Supabase client in `lib/supabase.ts`, types in `types/`.
- Dark theme default. Colors via a single `constants/theme.ts` — no hardcoded hex in components. Base palette: bg `#0D0B14`, surface `#171422`, text `#E8E4F3`, muted `#6B6880`, accent `#B8A9E8`.
- Keep components small (<150 lines); extract when bigger.
- Every API call handles loading + error states visibly.
- Explain non-obvious code with brief comments (founder is learning).
- Never store secrets in the repo; use `.env` + `app.config.ts`.
