// The natal chart wheel (My Chart tab). Every ring is tappable:
// planets → their Learn lesson, houses → the (locked) Houses level paywall,
// zodiac signs → a short blurb sheet. Pure SVG, sized to fit its parent's
// width via a fixed-design viewBox that scales down/up cleanly.
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { colors } from '@/constants/theme';
import {
  ASPECT_LINE_COLORS, expandSign, PLANET_GLYPHS, SIGN_BLURBS, SIGN_GLYPHS, SIGN_NAMES,
} from '@/constants/astro';
import {
  absoluteDegree, angularSeparation, findAspect, houseSpanDegrees,
  polarPoint, ringSegmentPath, toScreenAngle,
} from '@/lib/chart-wheel-math';
import type { Chart } from '@/lib/learn';

const SIZE = 320;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_EDGE = 150;
const R_ZODIAC_OUTER = 148;
const R_ZODIAC_INNER = 126;
const R_HOUSE_OUTER = 124;
const R_HOUSE_INNER = 104;
const R_PLANET = 86;
const R_PLANET_ALT = 66;
const R_ASPECT = 48;
const R_CORE = 44;

const ANGLE_LABELS: Record<number, string> = { 1: 'AC', 4: 'IC', 7: 'DC', 10: 'MC' };
const SIGN_ABBRS = Object.keys(SIGN_NAMES);

export default function ChartWheel({
  chart, onPlanetPress, onHousePress,
}: {
  chart: Chart;
  onPlanetPress: (planetKey: string) => void;
  onHousePress: () => void;
}) {
  const [signSheet, setSignSheet] = useState<string | null>(null);

  const ascDeg = useMemo(() => {
    const h1 = chart.houses?.find((h) => h.house === 1);
    return h1 ? absoluteDegree(h1.sign, h1.position) : 0;
  }, [chart]);

  const angle = (absDeg: number) => toScreenAngle(absDeg, ascDeg);

  const planetPoints = useMemo(() => {
    const sorted = [...chart.placements]
      .map((p) => ({ ...p, absDeg: absoluteDegree(p.sign, p.position) }))
      .sort((a, b) => a.absDeg - b.absDeg);
    // Stagger glyphs onto an alternate (inner) radius when two placements
    // land within 8° of each other, so close conjunctions don't overlap.
    const { out } = sorted.reduce<{ out: (typeof sorted[number] & { glyphR: number })[]; lastDeg: number | null; lastR: number }>(
      (acc, p) => {
        const crowded = acc.lastDeg != null && angularSeparation(p.absDeg, acc.lastDeg) < 8;
        const r = crowded ? (acc.lastR === R_PLANET ? R_PLANET_ALT : R_PLANET) : R_PLANET;
        return { out: [...acc.out, { ...p, glyphR: r }], lastDeg: p.absDeg, lastR: r };
      },
      { out: [], lastDeg: null, lastR: R_PLANET },
    );
    return out;
  }, [chart.placements]);

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
        <Circle cx={CX} cy={CY} r={R_EDGE} stroke={colors.muted} strokeWidth={1} fill="none" opacity={0.4} />

        {/* Zodiac ring — 12 equal 30° wedges, tappable for a quick blurb. */}
        {SIGN_ABBRS.map((abbr, i) => {
          const start = i * 30;
          const end = start + 30;
          const d = ringSegmentPath(CX, CY, R_ZODIAC_INNER, R_ZODIAC_OUTER, angle(start), angle(end));
          const mid = polarPoint(CX, CY, (R_ZODIAC_INNER + R_ZODIAC_OUTER) / 2, angle(start + 15));
          return (
            <G key={abbr} onPress={() => setSignSheet(expandSign(abbr))}>
              <Path d={d} fill={i % 2 === 0 ? colors.surface : colors.bg} stroke={colors.muted} strokeWidth={0.5} opacity={0.9} />
              <SvgText x={mid.x} y={mid.y + 5} fontSize={13} fill={colors.accent} textAnchor="middle">
                {SIGN_GLYPHS[abbr]}
              </SvgText>
            </G>
          );
        })}

        {/* House ring — real cusp positions, tappable → Houses paywall. */}
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
          const midAngle = angle(startAbs + span / 2);
          const mid = polarPoint(CX, CY, (R_HOUSE_INNER + R_HOUSE_OUTER) / 2, midAngle);
          return (
            <G key={h.house} onPress={onHousePress}>
              <Path d={d} fill={colors.bg} stroke={colors.muted} strokeWidth={0.5} opacity={0.5} />
              <SvgText x={mid.x} y={mid.y + 4} fontSize={10} fill={colors.muted} textAnchor="middle">
                {h.house}
              </SvgText>
            </G>
          );
        })}

        {/* Cusp lines — the 4 angles (AC/IC/DC/MC) bold, the rest faint. */}
        {houses.map((h) => {
          const absDeg = absoluteDegree(h.sign, h.position);
          const a = angle(absDeg);
          const isAngle = h.house === 1 || h.house === 4 || h.house === 7 || h.house === 10;
          const outer = polarPoint(CX, CY, R_ZODIAC_OUTER, a);
          const inner = polarPoint(CX, CY, isAngle ? R_CORE : R_HOUSE_INNER, a);
          const labelPt = polarPoint(CX, CY, R_HOUSE_INNER - 12, a);
          return (
            <G key={`cusp-${h.house}`}>
              <Line
                x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                stroke={isAngle ? colors.accent : colors.muted}
                strokeWidth={isAngle ? 1.2 : 0.5}
                opacity={isAngle ? 0.8 : 0.4}
              />
              {ANGLE_LABELS[h.house] && (
                <SvgText x={labelPt.x} y={labelPt.y} fontSize={9} fill={colors.accent} textAnchor="middle" opacity={0.8}>
                  {ANGLE_LABELS[h.house]}
                </SvgText>
              )}
            </G>
          );
        })}

        <Circle cx={CX} cy={CY} r={R_CORE} stroke={colors.muted} strokeWidth={0.5} fill="none" opacity={0.35} />

        {/* Aspect lines, drawn as chords between each planet's inner anchor. */}
        {aspects.map(({ a, b, type }, i) => {
          const p1 = polarPoint(CX, CY, R_ASPECT, angle(a.absDeg));
          const p2 = polarPoint(CX, CY, R_ASPECT, angle(b.absDeg));
          return (
            <Line
              key={i}
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke={ASPECT_LINE_COLORS[type]}
              strokeWidth={type === 'conjunction' ? 0.6 : 1}
              opacity={0.55}
            />
          );
        })}

        {/* Planet glyphs — the tappable core of the wheel. */}
        {planetPoints.map((p) => {
          const pos = polarPoint(CX, CY, p.glyphR, angle(p.absDeg));
          const glyph = PLANET_GLYPHS[capitalize(p.planet)] ?? '✦';
          return (
            <G key={p.planet} onPress={() => onPlanetPress(capitalize(p.planet))}>
              <Circle cx={pos.x} cy={pos.y} r={13} fill={colors.bg} stroke={colors.accent} strokeWidth={1} />
              <SvgText x={pos.x} y={pos.y + 5} fontSize={13} fill={colors.text} textAnchor="middle">
                {glyph}
              </SvgText>
              {p.retrograde && (
                <SvgText x={pos.x + 11} y={pos.y - 8} fontSize={8} fill={colors.error} textAnchor="middle">
                  ℞
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>

      <Modal transparent visible={!!signSheet} animationType="fade" onRequestClose={() => setSignSheet(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSignSheet(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetGlyph}>{signSheet && SIGN_GLYPHS[Object.keys(SIGN_NAMES).find((k) => SIGN_NAMES[k] === signSheet) ?? '']}</Text>
            <Text style={styles.sheetTitle}>{signSheet}</Text>
            <Text style={styles.sheetBody}>{signSheet ? SIGN_BLURBS[signSheet] : ''}</Text>
            <Pressable style={styles.sheetClose} onPress={() => setSignSheet(null)}>
              <Text style={styles.sheetCloseText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 32 },
  sheet: { backgroundColor: colors.surface, borderRadius: 20, padding: 24, alignItems: 'center' },
  sheetGlyph: { color: colors.accent, fontSize: 36, marginBottom: 8 },
  sheetTitle: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 10 },
  sheetBody: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  sheetClose: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10, backgroundColor: colors.bg },
  sheetCloseText: { color: colors.accent, fontWeight: '600' },
});
