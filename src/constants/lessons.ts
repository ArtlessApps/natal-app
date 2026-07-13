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
// Static "concept" lessons (Level 0) have no planetKey — they're the same
// for everyone and carry their full text in `body`.
export type Lesson = {
  id: string;
  title: string;
  // The planet this lesson reads from the user's chart.
  // Leave it off for static lessons.
  planetKey?: string;
  // One-liner shown under the title in the Learn list, and above the body.
  intro: string;
  // Full lesson text for static lessons. Placement lessons don't use this —
  // their long-form reading comes from content_natal instead.
  body?: string;
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
    id: 'basics',
    index: 0,
    title: 'The Basics',
    subtitle: 'How any of this works, in four short reads.',
    locked: false,
    lessons: [
      {
        id: 'basics-birth-chart',
        title: 'What is a birth chart?',
        intro: 'The snapshot of the sky you were born under.',
        body:
          'At the exact moment you were born, every planet was sitting somewhere specific in the sky. Your birth chart is a snapshot of that moment, taken from the exact spot on Earth where you were born.\n\n' +
          'Think of it as a cosmic fingerprint. No two are alike — not even for twins born minutes apart.\n\n' +
          'Everything in this app is built from yours. Not a generic horoscope shared by everyone with your sun sign. Your date, your time, your place.\n\n' +
          'You don\u2019t need to learn the math. We did the calculations. The lessons ahead just walk you through what came out — one placement at a time.',
      },
      {
        id: 'basics-cosmic-weather',
        title: 'The cosmic weather',
        intro: 'Your chart is the location. The planets are the weather.',
        body:
          'Your birth chart is a freeze-frame. But the planets didn\u2019t stop moving after you were born.\n\n' +
          'Every day, as they continue their orbits, they interact with the positions in your chart — and different areas of your life light up.\n\n' +
          'Weather is the easiest way to think about it. Your birth chart is your location. It never changes. The moving planets are the weather passing through. Some days bring gentle sun. Some bring storms.\n\n' +
          'That\u2019s what your daily reading is: a weather report for your exact spot in the sky. Same sky as everyone else, different forecast.',
      },
      {
        id: 'basics-intensity',
        title: 'Why some days feel bigger',
        intro: 'Slow planets write chapters. Fast ones make ripples.',
        body:
          'Not every planetary movement hits the same.\n\n' +
          'The slow ones — Saturn, Uranus, Neptune, Pluto — create themes that last weeks or months. These are the big chapters. The shifts that unfold slowly, quietly, and for keeps.\n\n' +
          'The fast ones — the Moon, Mercury, Venus — make daily ripples. Subtle emotional weather you might not consciously clock, but it colors the day.\n\n' +
          'Mars, Jupiter, and the Sun sit in between. Present, but manageable.\n\n' +
          'You\u2019ll see this in the badge on your daily reading — some days are collisions, some are ripples. You don\u2019t need to memorize any of it. Just notice which days feel profound and which barely register. Over time, that tells you which weather matters most to you.',
      },
      {
        id: 'basics-mirror',
        title: 'A mirror, not a map',
        intro: 'A self-awareness tool, not fortune-telling.',
        body:
          'One thing worth settling before your first lesson: none of this predicts your future.\n\n' +
          'The stars don\u2019t control you. They mirror cycles already moving through your life. A reading reflects a pattern — you decide what it means.\n\n' +
          'Some days will feel uncannily accurate. Others won\u2019t land at all. Both are useful. When something doesn\u2019t resonate, it\u2019s worth asking why not. That\u2019s data too.\n\n' +
          'You might not always see the connection right away. Sometimes the dots take weeks to connect. That\u2019s how it\u2019s supposed to work.\n\n' +
          'Mirror, not map. Awareness, not destiny.',
      },
    ],
  },
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
  ALL_UNLOCKABLE_LESSONS
    .filter((l) => l.planetKey)
    .map((l) => [l.planetKey!.toLowerCase(), l.id]),
);
export const lessonIdForPlanetKey = (planetKey: string): string | null =>
  LESSON_ID_BY_PLANET_KEY[planetKey.toLowerCase()] ?? null;

const BIG3_PLANET_KEYS = { sun: 'Sun', moon: 'Moon', rising: 'Ascendant' } as const;
export const lessonIdForBig3Key = (key: keyof typeof BIG3_PLANET_KEYS): string | null =>
  lessonIdForPlanetKey(BIG3_PLANET_KEYS[key]);
