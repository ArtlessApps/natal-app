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
