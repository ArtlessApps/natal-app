// Lesson catalog for the Learn tab (PRD §4.4). This is plain data so the
// curriculum is easy to edit. Lesson content itself comes from the user's
// chart (placement) + the content_natal table (analysis_text); this file
// only defines the structure, ordering, and the planet-agnostic intro copy
// shown while (or if) content_natal has no row for a placement.
//
// NOTE (deviation from PRD §4.4): the PRD lists Level 2 as "7 lessons", but
// there are 8 non-luminary planets (Mercury…Pluto). We ship all 8 so
// "% of your chart you can read" can actually reach 100% — Pluto shouldn't be
// permanently unreadable. Drop 'planet-pluto' below to match the literal spec.

// planetKey is what we query content_natal.planet by (case-insensitive) and
// how we find the placement in chart_json. 'Ascendant' = the Rising sign
// (1st-house cusp), which lives in chart_json.big3.rising, not placements.
export type Lesson = {
  id: string;
  title: string;
  planetKey: string;
  // Short, planet-agnostic "what this placement governs" intro.
  intro: string;
};

export type Level = {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  locked: boolean; // Levels 3–5 are paid (paywall stub in MVP)
  lessons: Lesson[];
};

export const LEVELS: Level[] = [
  {
    id: 'big3',
    index: 1,
    title: 'Your Big 3',
    subtitle: 'The three placements everyone starts with.',
    locked: false,
    lessons: [
      {
        id: 'big3-sun',
        title: 'Your Sun',
        planetKey: 'Sun',
        intro: 'Your Sun is your core drive — what you’re here to grow into and where you shine when you’re most yourself.',
      },
      {
        id: 'big3-moon',
        title: 'Your Moon',
        planetKey: 'Moon',
        intro: 'Your Moon is your inner weather — how you feel and self-soothe before you think.',
      },
      {
        id: 'big3-rising',
        title: 'Your Rising',
        planetKey: 'Ascendant',
        intro: 'Your Rising (Ascendant) is your doorway — the vibe people meet first and how you instinctively approach the new.',
      },
    ],
  },
  {
    id: 'planets',
    index: 2,
    title: 'Your Planets',
    subtitle: 'The rest of your placements, one at a time.',
    locked: false,
    lessons: [
      { id: 'planet-mercury', title: 'Your Mercury', planetKey: 'Mercury', intro: 'Mercury is how you think, talk, and process information.' },
      { id: 'planet-venus', title: 'Your Venus', planetKey: 'Venus', intro: 'Venus is how you love, what you find beautiful, and what you value.' },
      { id: 'planet-mars', title: 'Your Mars', planetKey: 'Mars', intro: 'Mars is your drive and anger — how you go after what you want.' },
      { id: 'planet-jupiter', title: 'Your Jupiter', planetKey: 'Jupiter', intro: 'Jupiter is where you expand, take risks, and find luck and meaning.' },
      { id: 'planet-saturn', title: 'Your Saturn', planetKey: 'Saturn', intro: 'Saturn is your discipline and limits — where you work hardest and mature slowest.' },
      { id: 'planet-uranus', title: 'Your Uranus', planetKey: 'Uranus', intro: 'Uranus is where you break rules and need freedom.' },
      { id: 'planet-neptune', title: 'Your Neptune', planetKey: 'Neptune', intro: 'Neptune is your imagination and where the boundaries blur.' },
      { id: 'planet-pluto', title: 'Your Pluto', planetKey: 'Pluto', intro: 'Pluto is where you transform — power, obsession, and deep change.' },
    ],
  },
  {
    id: 'houses',
    index: 3,
    title: 'Your Houses',
    subtitle: 'Where in life each energy plays out.',
    locked: true,
    lessons: [],
  },
  {
    id: 'aspects',
    index: 4,
    title: 'Your Aspects',
    subtitle: 'How your placements talk to each other.',
    locked: true,
    lessons: [],
  },
  {
    id: 'transits',
    index: 5,
    title: 'Your Transits',
    subtitle: 'How today’s sky moves through your chart.',
    locked: true,
    lessons: [],
  },
];

// Flat list of every lesson that counts toward "% of your chart you can read"
// (free, unlockable Levels 1–2).
export const ALL_UNLOCKABLE_LESSONS: Lesson[] = LEVELS
  .filter((l) => !l.locked)
  .flatMap((l) => l.lessons);

export const findLesson = (id: string): { lesson: Lesson; level: Level } | null => {
  for (const level of LEVELS) {
    const lesson = level.lessons.find((l) => l.id === id);
    if (lesson) return { lesson, level };
  }
  return null;
};

// planetKey (e.g. "Sun", "Ascendant") → lesson id, for screens (My Chart)
// that need to link a raw placement straight to its Learn lesson.
const LESSON_ID_BY_PLANET_KEY: Record<string, string> = Object.fromEntries(
  ALL_UNLOCKABLE_LESSONS.map((l) => [l.planetKey.toLowerCase(), l.id]),
);
export const lessonIdForPlanetKey = (planetKey: string): string | null =>
  LESSON_ID_BY_PLANET_KEY[planetKey.toLowerCase()] ?? null;
