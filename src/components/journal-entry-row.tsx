// One row in the Journal list (PRD 4.3): date, excerpt, transit tag chip,
// intensity badge. Tapping opens the entry detail screen.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { BADGE_COLORS, badgeLabel, transitTag } from '@/constants/astro';
import type { JournalEntry } from '@/types/journal';

type Props = {
  entry: JournalEntry;
  onPress: () => void;
};

function formatDate(entryDate: string): string {
  return new Date(`${entryDate}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function JournalEntryRow({ entry, onPress }: Props) {
  const tag = transitTag(entry.transit_planet, entry.aspect, entry.natal_planet);
  const badgeColor = entry.intensity ? BADGE_COLORS[entry.intensity] : colors.muted;

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.topLine}>
        <Text style={styles.date}>{formatDate(entry.entry_date)}</Text>
        {!!entry.intensity && (
          <View style={[styles.badge, { borderColor: badgeColor }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>
              {badgeLabel(entry.intensity)}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.excerpt} numberOfLines={2}>{entry.text}</Text>
      {!!tag && (
        <View style={styles.chip}>
          <Text style={styles.chipText}>{tag}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 12 },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  date: { color: colors.muted, fontSize: 12, letterSpacing: 1 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  excerpt: { color: colors.text, fontSize: 15, lineHeight: 21 },
  chip: { alignSelf: 'flex-start', backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 10 },
  chipText: { color: colors.accent, fontSize: 12 },
});
