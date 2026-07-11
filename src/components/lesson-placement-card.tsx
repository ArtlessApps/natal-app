// The user's own placement for a lesson (or a "not in your chart" state)
// shown at the top of a lesson detail screen.
import { StyleSheet, Text } from 'react-native';
import { colors, fonts, spacing, type } from '@/constants/theme';
import { Card, Heading } from '@/components/ui';
import { expandSign, houseOrdinal } from '@/constants/astro';
import type { Placementish } from '@/lib/learn';

export default function LessonPlacementCard({ glyph, placement }: {
  glyph: string;
  placement: Placementish | null;
}) {
  if (!placement) {
    return (
      <Card style={styles.card}>
        <Text style={styles.meta}>This placement isn’t in your chart.</Text>
      </Card>
    );
  }
  return (
    <Card style={styles.card}>
      <Text style={styles.glyph}>{glyph}</Text>
      <Heading style={styles.sign}>{expandSign(placement.signAbbr)}</Heading>
      <Text style={styles.meta}>
        {placement.house ? `${houseOrdinal(placement.house)} house` : 'House unknown'}
        {placement.retrograde ? ' · retrograde' : ''}
      </Text>
      {placement.approximate && !placement.house && (
        <Text style={styles.caveat}>Approximate — birth time unknown</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', marginBottom: spacing.lg },
  glyph: { color: colors.accent, fontSize: 34 },
  sign: { marginTop: spacing.xs },
  meta: { fontFamily: fonts.body, fontSize: type.small, color: colors.muted, marginTop: 4 },
  caveat: { fontFamily: fonts.bodyMedium, fontSize: type.caption, color: colors.accent, marginTop: spacing.sm },
});
