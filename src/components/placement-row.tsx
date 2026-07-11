// Row for a single planet/point placement in the chart detail list —
// tappable through to its Learn lesson when one exists.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, shadow, spacing, type } from '@/constants/theme';
import { houseOrdinal } from '@/constants/astro';
import type { Placementish } from '@/lib/learn';

export default function PlacementRow({
  glyph, planetName, placement, onPress,
}: {
  glyph: string;
  planetName: string;
  placement: Placementish;
  onPress?: () => void;
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
    <Row style={styles.row} onPress={onPress}>
      <Text style={styles.glyph}>{glyph}</Text>
      <View style={styles.body}>
        <Text style={styles.planet}>{planetName}</Text>
        <Text style={styles.meta}>
          {sign}{meta ? ` · ${meta}` : ''}
          {placement.approximate && !placement.house ? ' (approx.)' : ''}
        </Text>
      </View>
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
  glyph: { color: colors.accent, fontSize: 20, width: 30, textAlign: 'center' },
  body: { flex: 1, marginLeft: spacing.xs + 2 },
  planet: { fontFamily: fonts.bodySemibold, fontSize: type.body, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: type.small, color: colors.muted, marginTop: 2 },
  chevron: { color: colors.muted, fontSize: 22, marginLeft: spacing.sm },
});
