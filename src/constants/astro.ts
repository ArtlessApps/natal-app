// Small lookup tables shared by any screen that renders raw driver data
// from the API (planet/aspect names) as astrology glyphs and plain English.
import { colors } from '@/constants/theme';

export const PLANET_GLYPHS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

export const ASPECT_GLYPHS: Record<string, string> = {
  conjunction: '☌', sextile: '⚹', square: '□', trine: '△', opposition: '☍',
};

// One-paragraph, planet-agnostic explanation of what each aspect type does.
// Keeps the "Why?" disclosure honest without needing new content-table rows.
export const ASPECT_LESSONS: Record<string, string> = {
  conjunction:
    'A conjunction fuses two planets together — their energies blend into one signal rather than two separate ones. It tends to feel less like a conflict and more like an intensifying, "both at once."',
  sextile:
    'A sextile is an easy, cooperative angle. The two planets support each other, opening a low-friction opportunity — but ease means it is also easy to let it pass by unused.',
  square:
    'A square is friction by design. The two planets pull in different directions, creating pressure that forces a choice or an action. Uncomfortable, but usually productive if you move with it instead of against it.',
  trine:
    'A trine is the smoothest angle in astrology — same element, same rhythm. Things flow easily here, for better or worse; it can feel like talent, or like coasting.',
  opposition:
    'An opposition puts two planets face to face, 180° apart. It plays out as a tension between two real needs rather than a clean fight — the resolution is usually "both," not "either."',
};

export const badgeLabel = (type: string) => (type === 'WALKING' ? 'TODAY' : type);

// Shared across the Today "Why?" badge and the Journal list/detail badges,
// so an entry always looks the same whichever screen it's read from.
export const BADGE_COLORS: Record<string, string> = {
  COLLISION: colors.error,
  TRANSIT: colors.accent,
  RIPPLE: colors.muted,
  WALKING: colors.muted,
};

// "Mars □ Sun" style tag for a journal entry / list row.
export function transitTag(transitPlanet: string | null, aspect: string | null, natalPlanet: string | null): string {
  if (!transitPlanet) return '';
  if (aspect && natalPlanet) {
    const aGlyph = ASPECT_GLYPHS[aspect] ?? aspect;
    return `${transitPlanet} ${aGlyph} ${natalPlanet}`;
  }
  return `${transitPlanet} ${PLANET_GLYPHS[transitPlanet] ?? ''}`.trim();
}
