// Journal tab (PRD 4.3): reverse-chronological entries with filters.
// Private by design — no sharing anywhere in this screen.
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/theme';
import JournalEntryRow from '@/components/journal-entry-row';
import JournalFilters, { EMPTY_FILTERS, type JournalFilters as Filters } from '@/components/journal-filters';
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
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

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
            <Text style={styles.title}>Journal</Text>
            <Text style={styles.privacy}>Your journal is never shared or sold.</Text>
            <JournalFilters filters={filters} onChange={setFilters} />
          </>
        }
        renderItem={({ item }) => (
          <JournalEntryRow entry={item} onPress={() => router.push(`/journal/${item.id}`)} />
        )}
        ListEmptyComponent={
          entries === null ? (
            <ActivityIndicator color={colors.accent} style={styles.spinner} />
          ) : (
            <Text style={styles.empty}>
              {entries.length === 0
                ? "No entries yet. Answer today's prompt on the Today tab to start."
                : 'Nothing matches those filters.'}
            </Text>
          )
        }
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 24, paddingTop: 70, paddingBottom: 60 },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', marginBottom: 6 },
  privacy: { color: colors.muted, fontSize: 13, marginBottom: 20 },
  spinner: { marginTop: 60 },
  empty: { color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 40, lineHeight: 20 },
  error: { color: colors.error, textAlign: 'center', padding: 16 },
});
