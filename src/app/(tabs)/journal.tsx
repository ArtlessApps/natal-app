// Journal tab (PRD 4.3): reverse-chronological entries with filters.
// Private by design — no sharing anywhere in this screen.
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { colors, spacing } from '@/constants/theme';
import { Caption, Tagline, Title } from '@/components/ui';
import JournalEntryRow from '@/components/journal-entry-row';
import JournalFilterBar, { EMPTY_FILTERS, type JournalFilters as Filters } from '@/components/journal-filters';
import LockedFeatureRow from '@/components/locked-feature-row';
import PaywallSheet from '@/components/PaywallSheet';
import { useIsPlus } from '@/lib/subscription';
import type { JournalEntry } from '@/types/journal';

function matches(entry: JournalEntry, filters: Filters): boolean {
  if (filters.planet && entry.transit_planet !== filters.planet) return false;
  if (filters.aspect && entry.aspect !== filters.aspect) return false;
  if (filters.intensity && entry.intensity !== filters.intensity) return false;
  if (filters.phase && entry.phase !== filters.phase) return false;
  return true;
}

export default function JournalScreen() {
  const router = useRouter();
  const isPlus = useIsPlus();
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [paywall, setPaywall] = useState(false);

  const load = useCallback(() => {
    supabase
      .from('journal_entries')
      .select('*')
      .order('entry_date', { ascending: false })
      .then(({ data, error: dbError }) => {
        if (dbError) setError(dbError.message);
        else setEntries((data as JournalEntry[]) ?? []);
      });
  }, []);

  // Refetch whenever this tab regains focus (e.g. after saving/deleting
  // an entry in the detail screen or writing a new one on Today).
  useFocusEffect(load);

  const visible = (entries ?? []).filter((e) => matches(e, filters));

  return (
    <View style={styles.wrap}>
      <FlatList
        data={visible}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <>
            <Title>Journal</Title>
            <Caption style={styles.privacy}>Your journal is never shared or sold.</Caption>
            {!isPlus && (
              <View style={styles.insights}>
                <LockedFeatureRow
                  title="Pattern insights"
                  subtitle="See themes across your entries — Natal Plus."
                  onPress={() => setPaywall(true)}
                />
              </View>
            )}
            <JournalFilterBar filters={filters} onChange={setFilters} />
          </>
        }
        renderItem={({ item }) => (
          <JournalEntryRow entry={item} onPress={() => router.push(`/journal/${item.id}`)} />
        )}
        ListEmptyComponent={
          entries === null ? (
            <ActivityIndicator color={colors.accent} style={styles.spinner} />
          ) : (
            <Tagline style={styles.empty}>
              {entries.length === 0
                ? "No entries yet. Answer today's prompt on the Today tab to start."
                : 'Nothing matches those filters.'}
            </Tagline>
          )
        }
      />
      {!!error && <Caption style={styles.error}>{error}</Caption>}

      <PaywallSheet
        visible={paywall}
        source="pattern_insights"
        onClose={() => setPaywall(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingTop: 70, paddingBottom: spacing.xxl },
  privacy: { marginTop: spacing.xs, marginBottom: spacing.lg },
  insights: { marginBottom: spacing.lg },
  spinner: { marginTop: spacing.xxl },
  empty: { textAlign: 'center', marginTop: spacing.xxl },
  error: { color: colors.error, textAlign: 'center', padding: spacing.md },
});
