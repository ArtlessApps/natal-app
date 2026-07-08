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
  return res.json() as Promise<{ chart: any }>;
}
