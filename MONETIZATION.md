# MONETIZATION.md — Natal Pricing & Paywall Spec

> **How to use this file (Cursor):** This document is authoritative for all pricing,
> tier, and paywall decisions. Reference it alongside `@PRD.md` when building
> Phase 10 (paywall) or any feature that touches tier gating. If this file and
> older notes conflict, this file wins.

---

## 1. Terminology change (global)

- The feature formerly called **"Friends"** is now called **"Connections"** everywhere:
  tab name, screen titles, button copy, variable names in NEW code, analytics events,
  and App Store copy.
- Existing code: rename user-facing strings immediately. Internal identifiers
  (table names, existing props) may be renamed opportunistically — do not do a risky
  mass refactor right before launch. New code must use `connection`/`connections`.
- Copy examples: "Add a Connection", "Your Connections", "Compare charts with a Connection".

---

## 2. Product & pricing

**One subscription. No à la carte purchases. No add-on packs. Ever.**
(Category research: the #1 complaint against Co-Star / The Pattern / Nebula is
paywall greed and opaque billing. Clean pricing is part of our brand, alongside
"your journal is private, never sold.")

| Plan | Price | Notes |
|---|---|---|
| Monthly | **$5.99/mo** | **7-day free trial** |
| Annual | **$39.99/yr** (~$3.33/mo) | **7-day free trial** — the plan we push |

- Subscription name: **Natal Plus**.
- Undercuts incumbents deliberately (Co-Star Plus $14.99/mo, The Pattern $14.99/mo,
  CHANI $11.99/mo).
- Default-selected plan on the paywall screen: **Annual with trial**.

---

## 3. Tiers

### FREE — forever. Never move these behind the paywall in any future update.

| Feature | Free tier |
|---|---|
| Natal chart + Big 3 reveal | ✅ Full |
| Daily reading + push notification | ✅ Full (this is the retention engine) |
| Journal writing | ✅ Unlimited (core-bet validation + privacy pitch) |
| Learn path | ✅ Levels 1–2 |
| Connections | ✅ **1 free Connection** |
| Echo | ✅ **First Echo only** (see §4.1) |

### NATAL PLUS (paid)

| Feature | Behavior for free users |
|---|---|
| **Echo** (transit-matched past entries) | Blurred tease after first free Echo |
| Journal pattern insights | Locked, contextual paywall on tap |
| Learn Levels 3–5 | Locked, contextual paywall on tap |
| **Unlimited Connections** | Adding Connection #2 triggers paywall |
| Transit calendar | Locked, contextual paywall on tap |
| Full chart interpretations (beyond Big 3 one-liners) | Locked, contextual paywall on tap |

---

## 4. Paywall placements (exactly three; do not add more)

All three placements open the **same** paywall screen component
(`components/PaywallSheet.tsx`), passed a `source` prop for analytics
(e.g. `source="echo_tease"`, `source="onboarding"`, `source="connection_limit"`).

### 4.1 Echo tease (primary converter)
- Every user gets their **first Echo free** — full text, no gate — so they feel it.
- All later Echoes for free users: show the header
  ("Last time Mars squared your Sun, you wrote…") with the journal entry
  **blurred** underneath and an "Unlock with Natal Plus" button → PaywallSheet.
- The blurred text must be the user's REAL entry rendered with a blur overlay,
  not placeholder text (it must feel real because it is).

### 4.2 Post-onboarding soft paywall
- Shown **once**, immediately after the Big 3 reveal, before the main tabs.
- Must have a clearly visible ✕ / "Not now" that is NOT hidden, delayed, or tiny.
- Never blocks onboarding. If dismissed, do not show again automatically —
  only the contextual gates below.

### 4.3 Contextual gates
- Triggered by tapping a locked feature in context:
  - Add **Connection #2+**
  - Open **Learn Level 3+**
  - Open **Transit calendar**
  - Open **Pattern insights**
  - Tap a locked full-chart interpretation
- No separate "Premium" tab or persistent upsell banners anywhere in the app.

### Connection-limit specifics
- Free users can add exactly **1 Connection** (guest charts count toward the limit).
- The "Add a Connection" button stays visible; tapping it at the limit opens
  PaywallSheet with copy like:
  "You've used your free Connection. Unlock unlimited Connections with Natal Plus."
- If a user downgrades/cancels: keep ALL existing Connections visible and readable
  (never delete or hide user data), but block adding new ones beyond 1.

---

## 5. Implementation notes

- **Use RevenueCat** (`react-native-purchases`) for all subscription logic.
  Do not call StoreKit directly. Entitlement identifier: `plus`.
- Gate features with a single hook, e.g. `useIsPlus()` in `lib/subscription.ts`,
  backed by RevenueCat's entitlement check. No scattered boolean flags.
- All paywall views fire analytics: `paywall_shown`, `paywall_dismissed`,
  `trial_started`, `purchase_completed` — each with the `source` prop.
- Restore purchases button on the PaywallSheet (App Store requirement).
- Cancellation: standard Apple-managed flow only. **No custom retention/cancel
  screens, no "pause" dark patterns.** This is a brand decision.
- Price strings must come from StoreKit/RevenueCat offerings at runtime
  (for correct localization/currency) — never hardcode "$5.99" in UI.

---

## 6. Copy & tone rules for paywall screens

- Honest, direct, zero manipulation. No countdown timers, no fake urgency,
  no "big energy shift, open to see" tactics.
- Lead with value: Echo + unlimited Connections + full Learn path.
- Include one privacy line: "Your journal stays private. Never sold, never shared."
- Trial copy must state clearly: "7 days free, then $39.99/yr. Cancel anytime."

---

## 7. Success metrics for monetization

- Onboarding paywall view → trial start: target ≥ 5%.
- Echo tease view → trial start: this is our bet — watch it closely; if it
  outperforms the onboarding paywall, double down on Echo in marketing.
- Trial → paid conversion: target ≥ 40% (annual-with-trial industry ballpark).
- Refund/complaint rate about billing: target ~0. If users complain about the
  paywall being unfair, revisit — fairness is the strategy.
