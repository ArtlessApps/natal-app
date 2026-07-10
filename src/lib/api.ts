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
export async function fetchDaily(birth: BirthData, targetDate: string) {
  const res = await fetch(`${API_URL}/daily`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...birth, target_date: targetDate }),
  });
  if (!res.ok) throw new Error(`Daily reading failed (${res.status})`);
  return res.json() as Promise<DailyReading>;
}

export type Big3 = { sun: string; moon: string; rising: string };

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
