// All calls to YOUR FastAPI service go through this file.
// Screens never fetch() directly — one place to change URLs or add auth later.

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

export type BirthData = {
  name: string;
  date: string;         // "1990-06-15"
  time: string | null;  // "14:30" or null
  lat: number;
  lng: number;
};

export async function fetchNatalChart(birth: BirthData) {
  const res = await fetch(`${API_URL}/natal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(birth),
  });
  if (!res.ok) throw new Error(`Chart calculation failed (${res.status})`);
  return res.json() as Promise<{ chart: any; tz_str: string }>;
}

export type DailyDriver = {
  transit_planet: string;
  natal_planet: string | null;
  aspect: string | null;
  orb: number | null;
  sign: string | null;
  phase: string | null;
  house: number | null;
};

export type DailyReading = {
  type: 'COLLISION' | 'TRANSIT' | 'RIPPLE' | 'WALKING';
  driver: DailyDriver;
  headline: string | null;
  body: string;
  prompt: string;
  content_id: number | null;
};

// The API doesn't have user accounts of its own yet (Step 6 debt item), so
// /daily takes the same birth data as /natal plus the date to compute.
// userId is optional server-side but always sent here — it's what lets
// compute_daily() persist/check per-user cooldowns in transit_cooldowns
// (PRD §8a) instead of the same aspect firing every day.
export async function fetchDaily(birth: BirthData, targetDate: string, userId: string) {
  const res = await fetch(`${API_URL}/daily`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...birth, target_date: targetDate, user_id: userId }),
  });
  if (!res.ok) throw new Error(`Daily reading failed (${res.status})`);
  return res.json() as Promise<DailyReading>;
}

export type Big3 = { sun: string; moon: string; rising: string };

// --- Friend invites (Step 8.6) --------------------------------------------
// These two routes are token-authenticated (the token IS the credential) and
// take no Supabase JWT — the guest has no account.

export type InviteInfo = {
  inviter_name: string;
  status: 'pending' | 'complete';
};

// Landing-page lookup. Returns null on 404 so the screen can show the graceful
// "isn't active" state; other failures throw for the generic error state.
export async function fetchInviteInfo(token: string): Promise<InviteInfo | null> {
  const res = await fetch(`${API_URL}/invite/${token}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Couldn’t load this invite (${res.status})`);
  return res.json() as Promise<InviteInfo>;
}

export type InviteSubmitResult = {
  big3: Big3;
  inviter_name: string;
};

// Guest submits their own birth data; the API computes their chart, completes
// the row, and pushes the owner. 409 means the token was already used.
export async function submitInvite(token: string, birth: BirthData): Promise<InviteSubmitResult> {
  const res = await fetch(`${API_URL}/invite/${token}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(birth),
  });
  if (res.status === 409) throw new Error('This invite was already used.');
  if (res.status === 404) throw new Error('This invite link isn’t active.');
  if (!res.ok) throw new Error(`Couldn’t cast your chart (${res.status})`);
  return res.json() as Promise<InviteSubmitResult>;
}

export type CompatInsight = {
  title: string;
  aspect: string | null;   // conjunction/sextile/square/trine/opposition, or null
  orb?: number;
  body: string;
};

export type CompatResult = {
  big3_a: Big3 | null;
  big3_b: Big3 | null;
  insights: CompatInsight[];
};

// Synastry-lite comparison (PRD §4.5). Passes the two chart_json objects the
// app already has (owner profile + friend guest chart) since the API has no
// server-side chart store — same tradeoff as /daily.
export async function fetchCompat(
  chartA: unknown,
  chartB: unknown,
  nameA: string,
  nameB: string,
) {
  const res = await fetch(`${API_URL}/compat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chart_a: chartA, chart_b: chartB, name_a: nameA, name_b: nameB }),
  });
  if (!res.ok) throw new Error(`Comparison failed (${res.status})`);
  return res.json() as Promise<CompatResult>;
}
