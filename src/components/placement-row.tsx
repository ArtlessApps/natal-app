// Row for a single planet/point placement in the chart detail list —
// tappable through to its Learn lesson when one exists.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, shadow, spacing, type } from '@/constants/theme';
import { houseOrdinal } from '@/constants/astro';
import type { Placementish } from '@/lib/learn';

export default function PlacementRow({
  glyph, planetName, placement, onPress, explored,
}: {
  glyph: string;
  planetName: string;
  placement: Placementish;
  onPress?: () => void;
  /** True when the user has completed this placement's Learn lesson. */
  explored?: boolean;
}) {
  const sign = placement.degree != null
    ? `${placement.signFull} ${Math.floor(placement.degree)}°`
    : placement.signFull;
  const meta = [
    placement.house ? `${houseOrdinal(placement.house)} house` : null,
    placement.retrograde ? 'retrograde' : null,
  ].filter(Boolean).join(' · ');

  const Row = onPress ? Pressable : View;
  return (
    <Row style={[styles.row, explored && styles.rowExplored]} onPress={onPress}>
      <View style={[styles.glyphWrap, explored && styles.glyphWrapExplored]}>
        <Text style={[styles.glyph, explored && styles.glyphExplored]}>{glyph}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.planet}>{planetName}</Text>
        <Text style={styles.meta}>
          {sign}{meta ? ` · ${meta}` : ''}
          {placement.approximate && !placement.house ? ' (approx.)' : ''}
        </Text>
      </View>
      {explored && (
        <View style={styles.check}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
      )}
      {onPress && <Text style={styles.chevron}>›</Text>}
    </Row>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
    ...shadow.card,
  },
  rowExplored: { borderColor: colors.accent, borderWidth: 1.5 },
  glyphWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphWrapExplored: { backgroundColor: colors.accent },
  glyph: { color: colors.accent, fontSize: 20, textAlign: 'center' },
  glyphExplored: { color: colors.bg },
  body: { flex: 1, marginLeft: spacing.xs + 2 },
  planet: { fontFamily: fonts.bodySemibold, fontSize: type.body, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: type.small, color: colors.muted, marginTop: 2 },
  check: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  checkMark: { color: colors.bg, fontSize: 12, fontFamily: fonts.bodyBold },
  chevron: { color: colors.muted, fontSize: 22, marginLeft: spacing.sm },
});
