// The natal chart wheel, redesigned as an "engraved star atlas":
//   • a fine gold double-ring frame (like an old celestial map)
//   • degree tick marks every 5° / 10° (the pro-astrology detail)
//   • zodiac wedges softly tinted by element (fire/earth/air/water)
//   • a warm radial glow behind the planets
//   • gold-haloed planet markers and a gold star at the center
//
// Fixes from the screenshot review:
//   1. EMOJI FIX — every glyph gets "\uFE0E" appended (the invisible
//      Unicode "text presentation selector"), which stops iOS from
//      rendering ♈♉♊… as purple emoji and lets our gold fill apply.
//   2. NO MORE PILE-UPS — planets live on ONE orbit; crowded clusters
//      fan apart via relaxDegrees(), and a thin pointer line ties each
//      glyph back to a dot at its TRUE degree on an inner anchor ring.
//   3. REAL ASPECT WEB — aspect lines now connect those anchor dots
//      across a proper inner circle, instead of floating scribbles.
//   4. LABELS BREATHE — AC/IC/DC/MC moved just OUTSIDE the gold frame,
//      clear of the planet zone. Canvas grew 320 → 340 to make room.
//
// Taps unchanged: planets → Learn lesson, houses → paywall,
// signs → blurb sheet. Same props — chart.tsx needs no edits.
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle, Defs, G, Line, Path, RadialGradient, Stop, Text as SvgText,
} from 'react-native-svg';
import { colors, fonts, radius, spacing, type } from '@/constants/theme';
import {
  ASPECT_LINE_COLORS, ELEMENT_TINTS, expandSign, PLANET_GLYPHS,
  SIGN_BLURBS, SIGN_ELEMENTS, SIGN_GLYPHS, SIGN_NAMES,
} from '@/constants/astro';
import {
  absoluteDegree, findAspect, houseSpanDegrees,
  polarPoint, relaxDegrees, ringSegmentPath, toScreenAngle,
} from '@/lib/chart-wheel-math';
import type { Chart } from '@/lib/learn';

// The invisible character that forces iOS to draw a symbol as TEXT
// (honoring our fill color) instead of as a colorful emoji.
const TXT = '\uFE0E';

// ---- Layout: every radius, from the outside in. ----
const SIZE = 340;          // canvas grew so the angle labels fit outside the frame
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_LABEL = 162;       // AC/IC/DC/MC labels — just outside the frame
const R_FRAME_OUTER = 155; // gold double ring
const R_FRAME_INNER = 151;
const R_ZODIAC_OUTER = 148;
const R_ZODIAC_INNER = 127;
const R_TICK_START = 127;  // degree ticks hang inside the zodiac ring
const R_TICK_5 = 123.5;
const R_TICK_10 = 121;
const R_HOUSE_OUTER = 119;
const R_HOUSE_INNER = 102;
const R_PLANET = 88;       // the ONE orbit all planet coins sit on
const COIN_R = 11;         // planet coin radius (halo is a bit larger)
const R_ANCHOR = 64;       // the inner ring where true-degree dots + aspects live

// A coin is ~22px wide; at radius 88 that's about 15° of arc — the minimum
// spacing relaxDegrees() enforces between neighboring glyphs.
const MIN_GLYPH_SEP = 15;

const ANGLE_LABELS: Record<number, string> = { 1: 'AC', 4: 'IC', 7: 'DC', 10: 'MC' };
const SIGN_ABBRS = Object.keys(SIGN_NAMES);

// chart_json stores planet names lowercase ("sun"); our lookups key on "Sun".
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function ChartWheel({
  chart, onPlanetPress, onHousePress, exploredPlanetKeys,
}: {
  chart: Chart;
  onPlanetPress: (planetKey: string) => void;
  onHousePress: () => void;
  /** Planet keys (e.g. "Sun", "Ascendant") whose Learn lesson is complete. */
  exploredPlanetKeys?: Set<string>;
}) {
  const [signSheet, setSignSheet] = useState<string | null>(null);

  // The Ascendant's absolute degree — the wheel rotates so it sits at
  // 9 o'clock, the standard chart orientation.
  const ascDeg = useMemo(() => {
    const h1 = chart.houses?.find((h) => h.house === 1);
    return h1 ? absoluteDegree(h1.sign, h1.position) : 0;
  }, [chart]);

  const angle = (absDeg: number) => toScreenAngle(absDeg, ascDeg);

  // Each planet carries TWO degrees now:
  //   absDeg   — its true position (drives anchors + aspect lines)
  //   glyphDeg — where its coin is drawn (fanned apart when crowded)
  const planetPoints = useMemo(() => {
    const sorted = [...chart.placements]
      .map((p) => ({ ...p, absDeg: absoluteDegree(p.sign, p.position) }))
      .sort((a, b) => a.absDeg - b.absDeg);
    const spread = relaxDegrees(sorted.map((p) => p.absDeg), MIN_GLYPH_SEP);
    return sorted.map((p, i) => ({ ...p, glyphDeg: spread[i] }));
  }, [chart.placements]);

  // Every meaningful angle between every pair of planets (true degrees).
  const aspects = useMemo(() => {
    const out: { a: typeof planetPoints[number]; b: typeof planetPoints[number]; type: string }[] = [];
    for (let i = 0; i < planetPoints.length; i++) {
      for (let j = i + 1; j < planetPoints.length; j++) {
        const type = findAspect(planetPoints[i].absDeg, planetPoints[j].absDeg);
        if (type) out.push({ a: planetPoints[i], b: planetPoints[j], type });
      }
    }
    return out;
  }, [planetPoints]);

  const houses = chart.houses ?? [];

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Defs>
          <RadialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colors.surface} stopOpacity="1" />
            <Stop offset="65%" stopColor={colors.surface} stopOpacity="0.55" />
            <Stop offset="100%" stopColor={colors.bg} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Warm glow behind the planet zone. */}
        <Circle cx={CX} cy={CY} r={R_HOUSE_INNER} fill="url(#coreGlow)" />

        {/* Gold double-ring frame. */}
        <Circle cx={CX} cy={CY} r={R_FRAME_OUTER} stroke={colors.gold} strokeWidth={1.2} fill="none" opacity={0.85} />
        <Circle cx={CX} cy={CY} r={R_FRAME_INNER} stroke={colors.gold} strokeWidth={0.6} fill="none" opacity={0.5} />

        {/* Zodiac ring — element-tinted wedges, tappable. Note the +TXT on
            the glyph: that's the emoji fix, so glyphs render gold. */}
        {SIGN_ABBRS.map((abbr, i) => {
          const start = i * 30;
          const d = ringSegmentPath(CX, CY, R_ZODIAC_INNER, R_ZODIAC_OUTER, angle(start), angle(start + 30));
          const mid = polarPoint(CX, CY, (R_ZODIAC_INNER + R_ZODIAC_OUTER) / 2, angle(start + 15));
          return (
            <G key={abbr} onPress={() => setSignSheet(expandSign(abbr))}>
              <Path
                d={d}
                fill={ELEMENT_TINTS[SIGN_ELEMENTS[abbr]]}
                fillOpacity={0.12}
                stroke={colors.border}
                strokeWidth={0.75}
              />
              <SvgText x={mid.x} y={mid.y + 5} fontSize={13} fill={colors.goldDeep} textAnchor="middle">
                {SIGN_GLYPHS[abbr] + TXT}
              </SvgText>
            </G>
          );
        })}

        {/* Degree ticks — every 5°, longer at 10°, skipping sign borders. */}
        {Array.from({ length: 72 }, (_, i) => i * 5)
          .filter((deg) => deg % 30 !== 0)
          .map((deg) => {
            const a = angle(deg);
            const outer = polarPoint(CX, CY, R_TICK_START, a);
            const inner = polarPoint(CX, CY, deg % 10 === 0 ? R_TICK_10 : R_TICK_5, a);
            return (
              <Line
                key={`tick-${deg}`}
                x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
                stroke={colors.goldDeep}
                strokeWidth={deg % 10 === 0 ? 0.7 : 0.5}
                opacity={0.45}
              />
            );
          })}

        {/* House ring — real cusp spans, tappable → Houses paywall. */}
        {houses.map((h) => {
          const next = houses.find((x) => x.house === (h.house % 12) + 1) ?? houses[0];
          const startAbs = absoluteDegree(h.sign, h.position);
          const nextAbs = absoluteDegree(next.sign, next.position);
          const span = houseSpanDegrees(startAbs, nextAbs);
          const d = ringSegmentPath(
            CX, CY, R_HOUSE_INNER, R_HOUSE_OUTER,
            angle(startAbs), angle(startAbs + span),
            Math.max(3, Math.round(span / 8)),
          );
          const mid = polarPoint(CX, CY, (R_HOUSE_INNER + R_HOUSE_OUTER) / 2, angle(startAbs + span / 2));
          return (
            <G key={h.house} onPress={onHousePress}>
              <Path d={d} fill={colors.surface} fillOpacity={0.5} stroke={colors.border} strokeWidth={0.6} />
              <SvgText x={mid.x} y={mid.y + 3.5} fontSize={9} fill={colors.muted} textAnchor="middle">
                {h.house}
              </SvgText>
            </G>
          );
        })}

        {/* Cusp lines — the 4 chart angles in deep gold, stopping at the
            anchor ring so they never slice through the aspect web. Their
            AC/IC/DC/MC labels now live OUTSIDE the frame, in clear air. */}
        {houses.map((h) => {
          const absDeg = absoluteDegree(h.sign, h.position);
          const a = angle(absDeg);
          const isAngle = h.house === 1 || h.house === 4 || h.house === 7 || h.house === 10;
          const outer = polarPoint(CX, CY, R_ZODIAC_OUTER, a);
          const inner = polarPoint(CX, CY, isAngle ? R_ANCHOR : R_HOUSE_INNER, a);
          const labelPt = polarPoint(CX, CY, R_LABEL, a);
          return (
            <G key={`cusp-${h.house}`}>
              <Line
                x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                stroke={isAngle ? colors.goldDeep : colors.muted}
                strokeWidth={isAngle ? 1.3 : 0.5}
                opacity={isAngle ? 0.85 : 0.3}
              />
              {ANGLE_LABELS[h.house] && (
                <SvgText
                  x={labelPt.x} y={labelPt.y + 3}
                  fontSize={9} letterSpacing={1}
                  fill={colors.goldDeep} textAnchor="middle"
                >
                  {ANGLE_LABELS[h.house]}
                </SvgText>
              )}
            </G>
          );
        })}

        {/* The anchor ring — a fine gold circle. Aspect lines and true-degree
            dots live on this rim, forming a deliberate geometric web. */}
        <Circle cx={CX} cy={CY} r={R_ANCHOR} stroke={colors.gold} strokeWidth={0.7} fill="none" opacity={0.55} />

        {/* Center star — under the web, quietly anchoring the composition. */}
        <SvgText x={CX} y={CY + 5.5} fontSize={15} fill={colors.gold} textAnchor="middle" opacity={0.8}>
          {'✦' + TXT}
        </SvgText>

        {/* Aspect web — chords between TRUE-degree points on the anchor rim.
            Conjunctions dotted (fused), harmony/tension solid. */}
        {aspects.map(({ a, b, type }, i) => {
          const p1 = polarPoint(CX, CY, R_ANCHOR, angle(a.absDeg));
          const p2 = polarPoint(CX, CY, R_ANCHOR, angle(b.absDeg));
          return (
            <Line
              key={i}
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke={ASPECT_LINE_COLORS[type]}
              strokeWidth={type === 'conjunction' ? 0.7 : 1}
              strokeLinecap="round"
              strokeDasharray={type === 'conjunction' ? '1.5,3' : undefined}
              opacity={0.55}
            />
          );
        })}

        {/* Planets. Three parts each:
              anchor dot — TRUE degree, on the rim (where aspects meet)
              pointer    — thin line from the coin to its anchor dot
              coin       — the tappable glyph, at its FANNED-OUT position */}
        {planetPoints.map((p) => {
          const planetKey = capitalize(p.planet);
          const explored = exploredPlanetKeys?.has(planetKey) ?? false;
          const coin = polarPoint(CX, CY, R_PLANET, angle(p.glyphDeg));
          const coinInner = polarPoint(CX, CY, R_PLANET - COIN_R - 1.5, angle(p.glyphDeg));
          const anchor = polarPoint(CX, CY, R_ANCHOR, angle(p.absDeg));
          const glyph = PLANET_GLYPHS[planetKey] ?? '✦';
          return (
            <G key={p.planet} onPress={() => onPlanetPress(planetKey)}>
              <Line
                x1={coinInner.x} y1={coinInner.y} x2={anchor.x} y2={anchor.y}
                stroke={explored ? colors.accent : colors.muted}
                strokeWidth={0.6}
                opacity={explored ? 0.75 : 0.5}
              />
              <Circle
                cx={anchor.x} cy={anchor.y} r={1.8}
                fill={explored ? colors.accent : colors.goldDeep}
                opacity={0.9}
              />
              <Circle
                cx={coin.x} cy={coin.y} r={COIN_R + 2.5}
                fill={explored ? colors.accent : colors.gold}
                opacity={explored ? 0.22 : 0.14}
              />
              <Circle
                cx={coin.x} cy={coin.y} r={COIN_R}
                fill={explored ? colors.accent : colors.surface}
                stroke={explored ? colors.accent : colors.goldDeep}
                strokeWidth={1.1}
              />
              <SvgText
                x={coin.x} y={coin.y + 4.5}
                fontSize={12}
                fill={explored ? colors.bg : colors.text}
                textAnchor="middle"
              >
                {glyph + TXT}
              </SvgText>
              {p.retrograde && (
                <SvgText x={coin.x + 10.5} y={coin.y - 7} fontSize={7.5} fill={colors.error} textAnchor="middle">
                  {'℞' + TXT}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>

      {/* Sign blurb sheet — unchanged behavior, light-theme card styling. */}
      <Modal transparent visible={!!signSheet} animationType="fade" onRequestClose={() => setSignSheet(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSignSheet(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetGlyph}>
              {signSheet && SIGN_GLYPHS[SIGN_ABBRS.find((k) => SIGN_NAMES[k] === signSheet) ?? ''] + TXT}
            </Text>
            <Text style={styles.sheetTitle}>{signSheet}</Text>
            <Text style={styles.sheetBody}>{signSheet ? SIGN_BLURBS[signSheet] : ''}</Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginVertical: spacing.md },

  // The one hardcoded color here: the ink color at ~45% opacity as a scrim
  // (theme.ts can't express transparency).
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 22, 18, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  sheetGlyph: { fontSize: 36, color: colors.gold },
  sheetTitle: { fontFamily: fonts.display, fontSize: type.heading, color: colors.text },
  sheetBody: {
    fontFamily: fonts.body,
    fontSize: type.body,
    color: colors.inkSoft,
    lineHeight: 24,
    textAlign: 'center',
  },
});
