// The "Why?" row from PRD 4.2: collapsed by default, shows the technical
// transit behind today's reading plus a short mini-lesson when expanded.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { ASPECT_GLYPHS, ASPECT_LESSONS, BADGE_COLORS, PLANET_GLYPHS, badgeLabel } from '@/constants/astro';
import type { DailyDriver, DailyReading } from '@/lib/api';

type Props = {
  type: DailyReading['type'];
  driver: DailyDriver;
};

function driverLine(type: Props['type'], driver: DailyDriver): string {
  if (type === 'WALKING') {
    const glyph = PLANET_GLYPHS[driver.transit_planet] ?? '';
    const phase = driver.phase && driver.phase !== 'Direct' ? ` (${driver.phase})` : '';
    return `${driver.transit_planet} ${glyph} walking through ${driver.sign ?? 'the sky'}${phase} — no major aspect to your chart today.`;
  }
  const tGlyph = PLANET_GLYPHS[driver.transit_planet] ?? '';
  const nGlyph = driver.natal_planet ? PLANET_GLYPHS[driver.natal_planet] ?? '' : '';
  const aGlyph = driver.aspect ? ASPECT_GLYPHS[driver.aspect] ?? driver.aspect : '';
  const orb = typeof driver.orb === 'number' ? ` (orb ${Math.abs(driver.orb).toFixed(1)}°)` : '';
  return `Transiting ${driver.transit_planet} ${tGlyph} ${driver.aspect} ${aGlyph} natal ${driver.natal_planet} ${nGlyph}${orb}`;
}

export default function WhyDisclosure({ type, driver }: Props) {
  const [open, setOpen] = useState(false);
  const lesson = driver.aspect ? ASPECT_LESSONS[driver.aspect] : null;

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.header} onPress={() => setOpen((v) => !v)}>
        <View style={[styles.badge, { borderColor: BADGE_COLORS[type] ?? colors.muted }]}>
          <Text style={[styles.badgeText, { color: BADGE_COLORS[type] ?? colors.muted }]}>
            {badgeLabel(type)}
          </Text>
        </View>
        <Text style={styles.toggle}>{open ? 'Why? ▲' : 'Why? ▼'}</Text>
      </Pressable>
      {open && (
        <View style={styles.body}>
          <Text style={styles.driverLine}>{driverLine(type, driver)}</Text>
          {driver.house != null && (
            <Text style={styles.houseLine}>Landing in your {driver.house}th house.</Text>
          )}
          {lesson && <Text style={styles.lesson}>{lesson}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  toggle: { color: colors.muted, fontSize: 14 },
  body: { marginTop: 12, backgroundColor: colors.surface, borderRadius: 12, padding: 14 },
  driverLine: { color: colors.text, fontSize: 14, lineHeight: 20 },
  houseLine: { color: colors.muted, fontSize: 13, marginTop: 6 },
  lesson: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 10 },
});
