// Birth-place geocoding. Uses Komoot Photon (OSM-backed autocomplete) rather
// than public Nominatim — Nominatim's free endpoint often 403s unidentified
// clients and is weaker at international city lookup from short queries.
export type Place = { label: string; lat: number; lng: number };

type PhotonProps = {
  name?: string;
  city?: string;
  state?: string;
  country?: string;
  osm_key?: string;
  osm_value?: string;
  type?: string;
};

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: PhotonProps;
};

// Settlements / admin areas only — skip stations, museums, airports, etc.
const PLACE_OSM_KEYS = new Set(['place', 'boundary']);
const PLACE_TYPES = new Set([
  'city', 'town', 'village', 'hamlet', 'municipality', 'locality',
  'district', 'county', 'state', 'country', 'suburb', 'neighbourhood',
]);
const PLACE_OSM_VALUES = new Set([
  'city', 'town', 'village', 'hamlet', 'municipality', 'suburb',
  'neighbourhood', 'county', 'state', 'province', 'country',
  'administrative', 'borough', 'quarter',
]);

function isSettlement(props: PhotonProps): boolean {
  if (!props.osm_key || !PLACE_OSM_KEYS.has(props.osm_key)) return false;
  if (props.type && PLACE_TYPES.has(props.type)) return true;
  if (props.osm_value && PLACE_OSM_VALUES.has(props.osm_value)) return true;
  return false;
}

function formatLabel(props: PhotonProps): string {
  const parts = [props.name, props.city, props.state, props.country]
    .filter((p): p is string => !!p && p.trim().length > 0);
  const deduped: string[] = [];
  for (const part of parts) {
    if (!deduped.some((d) => d.toLowerCase() === part.toLowerCase())) {
      deduped.push(part);
    }
  }
  return deduped.join(', ');
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url =
    `https://photon.komoot.io/api/?limit=8&lang=en&q=` +
    encodeURIComponent(q);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Place search failed (${res.status})`);
  }

  const data = (await res.json()) as { features?: PhotonFeature[] };
  const places: Place[] = [];
  const seen = new Set<string>();

  for (const feature of data.features ?? []) {
    const props = feature.properties ?? {};
    if (!isSettlement(props)) continue;

    const coords = feature.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    const [lng, lat] = coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const label = formatLabel(props);
    if (!label) continue;

    // Dedupe near-identical hits (Photon often returns city + admin boundary).
    const key = `${label.toLowerCase()}|${lat.toFixed(3)}|${lng.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    places.push({ label, lat, lng });
    if (places.length >= 5) break;
  }

  return places;
}
