// Geometry + aspect math for the natal chart wheel (My Chart tab). Pure
// functions, no React/RN imports, so they're easy to reason about/test in
// isolation from the SVG rendering in components/chart-wheel.tsx.
//
// Screen convention: x/y are normal RN coordinates (y increases downward).
// We place the Ascendant (1st house cusp) at 9 o'clock and let the zodiac
// wind the traditional direction from there — through the IC at 6 o'clock,
// the Descendant at 3 o'clock, the MC at 12 o'clock, and back to the
// Ascendant — which is the standard orientation used by every chart-drawing
// program. See toScreenAngle() below for the actual mapping.

// Aries…Pisces, in the same order/abbreviations as constants/astro.ts.
const SIGN_ORDER = ['Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir', 'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis'];

export function absoluteDegree(signAbbr: string, positionInSign: number): number {
  const idx = SIGN_ORDER.indexOf(signAbbr);
  return (idx < 0 ? 0 : idx * 30) + positionInSign;
}

// Standard-math angle (0° = 3 o'clock, increases toward 6 o'clock, since y
// is down) at which `absDeg` should be drawn, given where the Ascendant is.
export function toScreenAngle(absDeg: number, ascDeg: number): number {
  return 180 - (absDeg - ascDeg);
}

export function polarPoint(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// Ring-segment ("donut slice") as a sampled polygon, since sampling is far
// less error-prone than getting SVG arc sweep-flags right for a wheel that
// can be drawn in either angular direction.
export function ringSegmentPath(
  cx: number, cy: number, rInner: number, rOuter: number,
  angleStart: number, angleEnd: number, steps = 8,
): string {
  const outer = sampleArc(cx, cy, rOuter, angleStart, angleEnd, steps);
  const inner = sampleArc(cx, cy, rInner, angleEnd, angleStart, steps);
  const all = [...outer, ...inner];
  return `M ${all.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' L ')} Z`;
}

function sampleArc(cx: number, cy: number, r: number, a0: number, a1: number, steps: number) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    pts.push(polarPoint(cx, cy, r, a));
  }
  return pts;
}

// House cusps aren't 30° apart (Placidus etc.), so this walks the continuous
// (non-wrapping) span from one cusp to the next, handling the Aries-point
// wraparound for the 12th→1st house.
export function houseSpanDegrees(startAbsDeg: number, nextCuspAbsDeg: number): number {
  let span = (nextCuspAbsDeg - startAbsDeg) % 360;
  if (span <= 0) span += 360;
  return span;
}

export type AspectType = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';

const ASPECT_DEFS: { type: AspectType; angle: number; orb: number }[] = [
  { type: 'conjunction', angle: 0, orb: 8 },
  { type: 'sextile', angle: 60, orb: 6 },
  { type: 'square', angle: 90, orb: 7 },
  { type: 'trine', angle: 120, orb: 7 },
  { type: 'opposition', angle: 180, orb: 8 },
];

export function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return Math.min(diff, 360 - diff);
}

export function findAspect(absDeg1: number, absDeg2: number): AspectType | null {
  const sep = angularSeparation(absDeg1, absDeg2);
  for (const def of ASPECT_DEFS) {
    if (Math.abs(sep - def.angle) <= def.orb) return def.type;
  }
  return null;
}
