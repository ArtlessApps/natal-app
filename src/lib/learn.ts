// Data layer for the Learn tab. Lessons are built from the user's own chart
// (profiles.chart_json, written at onboarding) + content_natal reference rows
// read directly with the user's authenticated Supabase session (PRD §4.4 —
// content_natal is non-sensitive, so no FastAPI round-trip needed).
import { supabase } from '@/lib/supabase';
import { expandSign, houseNumber } from '@/constants/astro';

// Shape of profiles.chart_json (see natal-api serialize_chart).
type Placement = {
  planet: string;      // lowercase, e.g. "mercury"
  sign: string;        // abbreviated, e.g. "Gem"
  position: number;
  house: string;       // e.g. "Tenth_House"
  retrograde: boolean;
};
export type Chart = {
  big3: { sun: string; moon: string; rising: string };
  placements: Placement[];
  houses: { house: number; sign: string; position: number }[];
  birth_time_known?: boolean;
};

export type Placementish = {
  signAbbr: string;
  signFull: string;
  degree: number | null; // degrees into the sign, 0-30 (My Chart only; Ascendant has none)
  house: number | null;
  retrograde: boolean;
  // Rising is approximate when birth time is unknown (house math needs it).
  approximate: boolean;
};

export async function getChart(): Promise<{ chart: Chart | null; birthTimeKnown: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { chart: null, birthTimeKnown: false };
  const { data } = await supabase
    .from('profiles')
    .select('chart_json, birth_time')
    .eq('id', user.id)
    .single();
  const chart = (data?.chart_json as Chart | undefined) ?? null;
  return { chart, birthTimeKnown: !!data?.birth_time };
}

// Resolve a lesson's planetKey to the user's actual placement. 'Ascendant'
// (Rising) isn't in placements — it's the 1st-house cusp sign in big3.rising.
export function resolvePlacement(
  chart: Chart,
  planetKey: string,
  birthTimeKnown: boolean,
): Placementish | null {
  if (planetKey === 'Ascendant') {
    if (!chart.big3?.rising) return null;
    return {
      signAbbr: chart.big3.rising,
      signFull: expandSign(chart.big3.rising),
      degree: null, // not returned by /natal's big3 block
      house: 1,
      retrograde: false,
      approximate: !birthTimeKnown,
    };
  }
  const p = chart.placements?.find(
    (pl) => pl.planet.toLowerCase() === planetKey.toLowerCase(),
  );
  if (!p) return null;
  return {
    signAbbr: p.sign,
    signFull: expandSign(p.sign),
    degree: p.position,
    house: houseNumber(p.house),
    retrograde: p.retrograde,
    // Houses depend on birth time; sign of a planet doesn't, so only the
    // house is approximate/unknown when birth time is missing.
    approximate: !birthTimeKnown,
  };
}

// Fetch the long-form reading for a placement. Matches the original engine's
// lookup: ilike on planet/sign (case-insensitive), exact house. Returns null
// when there's no row (e.g. Ascendant, or gaps in content_natal).
export async function fetchNatalContent(
  planetKey: string,
  signFull: string,
  house: number | null,
): Promise<string | null> {
  if (house == null) return null;
  const { data, error } = await supabase
    .from('content_natal')
    .select('analysis_text')
    .ilike('planet', planetKey)
    .ilike('sign', signFull)
    .eq('house', house)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data?.analysis_text as string | undefined) ?? null;
}

export async function getCompletedLessonIds(): Promise<Set<string>> {
  const { data } = await supabase.from('learn_progress').select('lesson_id');
  return new Set((data ?? []).map((r: { lesson_id: string }) => r.lesson_id));
}

export async function setLessonComplete(lessonId: string, complete: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  if (complete) {
    const { error } = await supabase
      .from('learn_progress')
      .upsert({ user_id: user.id, lesson_id: lessonId }, { onConflict: 'user_id,lesson_id' });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('learn_progress')
      .delete()
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId);
    if (error) throw error;
  }
}
