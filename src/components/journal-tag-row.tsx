// Intensity badge + transit tag chip shown at the top of a journal entry.
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing, type } from '@/constants/theme';
import { badgeLabel } from '@/constants/astro';

export default function JournalTagRow({ intensity, badgeColor, tag }: {
  intensity: string | null;
  badgeColor: string;
  tag: string;
}) {
  if (!intensity && !tag) return null;
  return (
    <View style={styles.row}>
      {!!intensity && (
        <View style={[styles.badge, { borderColor: badgeColor }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel(intensity)}</Text>
        </View>
      )}
      {!!tag && (
        <View style={styles.chip}><Text style={styles.chipText}>{tag}</Text></View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  badge: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1 },
  chip: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs },
  chipText: { color: colors.accent, fontFamily: fonts.body, fontSize: type.caption },
});
