// Echo card on Today (PRD §4.2): one past entry whose transit tag matches
// today's, with excerpt + date + link into the journal detail screen.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';
import { transitTag } from '@/constants/astro';
import { echoLeadIn, findEcho, type EchoMatch } from '@/lib/echo';
import type { DailyDriver } from '@/lib/api';

type Props = {
  userId: string;
  entryDate: string;
  driver: DailyDriver;
};

function formatDate(entryDate: string): string {
  return new Date(`${entryDate}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function EchoCard({ userId, entryDate, driver }: Props) {
  const router = useRouter();
  const [match, setMatch] = useState<EchoMatch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No setLoading(true) here: the initial `useState(true)` already covers
    // the mount case, and this card's props are effectively set once per
    // Today-tab session (they don't change again until the next day/reload),
    // so re-arming the spinner on a later re-run isn't needed in practice.
    let cancelled = false;
    findEcho(userId, entryDate, driver).then((result) => {
      if (cancelled) return;
      setMatch(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, entryDate, driver.transit_planet, driver.natal_planet, driver.aspect]);

  if (loading) {
    return <ActivityIndicator color={colors.accent} style={styles.spinner} />;
  }
  if (!match) return null;

  const { entry } = match;
  const tag = transitTag(entry.transit_planet, entry.aspect, entry.natal_planet);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>ECHO</Text>
      <Text style={styles.leadIn}>{echoLeadIn(driver)}, you wrote…</Text>
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/journal/${entry.id}`)}
        accessibilityRole="button"
        accessibilityLabel="Open past journal entry"
      >
        <Text style={styles.date}>{formatDate(entry.entry_date)}</Text>
        <Text style={styles.excerpt} numberOfLines={3}>{entry.text}</Text>
        {!!tag && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{tag}</Text>
          </View>
        )}
        <Text style={styles.link}>Read entry →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 28 },
  spinner: { marginTop: 28 },
  label: { color: colors.muted, fontSize: 12, letterSpacing: 1.5, marginBottom: 8 },
  leadIn: { color: colors.text, fontSize: 16, fontWeight: '600', lineHeight: 22, marginBottom: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16 },
  date: { color: colors.muted, fontSize: 12, letterSpacing: 1, marginBottom: 8 },
  excerpt: { color: colors.text, fontSize: 15, lineHeight: 21, fontStyle: 'italic' },
  chip: {
    alignSelf: 'flex-start', backgroundColor: colors.bg, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4, marginTop: 12,
  },
  chipText: { color: colors.accent, fontSize: 12 },
  link: { color: colors.accent, fontSize: 13, fontWeight: '600', marginTop: 14 },
});
