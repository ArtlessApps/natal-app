// Journal entry detail (PRD 4.3): full text, that day's reading snapshot,
// edit/delete. Reached by tapping a row in the Journal tab.
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/theme';
import { BADGE_COLORS, badgeLabel, transitTag } from '@/constants/astro';
import type { JournalEntry } from '@/types/journal';

export default function JournalEntryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  // Inline confirm instead of Alert.alert(), which is a documented no-op on
  // react-native-web (no dialog, no callback) — this app supports web for
  // local dev, so Delete needs to actually work there too.
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    supabase.from('journal_entries').select('*').eq('id', id).single()
      .then(({ data, error: dbError }) => {
        if (dbError) setError(dbError.message);
        else {
          setEntry(data as JournalEntry);
          setText((data as JournalEntry).text);
        }
      });
  }, [id]);

  // router.back() throws ("GO_BACK not handled") when this screen was
  // reached directly (deep link, or a web page refresh, which resets
  // history) instead of pushed from the Journal list — fall back to
  // replacing with the list route so the button always works.
  function goToJournalList() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/journal');
  }

  async function saveEdit() {
    if (!entry || !text.trim()) return;
    setBusy(true);
    const { error: dbError } = await supabase
      .from('journal_entries')
      .update({ text: text.trim(), updated_at: new Date().toISOString() })
      .eq('id', entry.id);
    setBusy(false);
    if (dbError) { setError(dbError.message); return; }
    setEntry({ ...entry, text: text.trim() });
    setEditing(false);
  }

  async function deleteEntry() {
    if (!entry) return;
    setBusy(true);
    const { error: dbError } = await supabase.from('journal_entries').delete().eq('id', entry.id);
    setBusy(false);
    if (dbError) setError(dbError.message);
    else goToJournalList();
  }

  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!entry) return <ActivityIndicator color={colors.accent} style={styles.spinner} />;

  const tag = transitTag(entry.transit_planet, entry.aspect, entry.natal_planet);
  const badgeColor = entry.intensity ? BADGE_COLORS[entry.intensity] : colors.muted;

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.container}>
      <Pressable onPress={goToJournalList}><Text style={styles.back}>← Journal</Text></Pressable>

      <Text style={styles.date}>
        {new Date(`${entry.entry_date}T12:00:00`).toLocaleDateString(undefined, {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        })}
      </Text>

      <View style={styles.tagRow}>
        {!!entry.intensity && (
          <View style={[styles.badge, { borderColor: badgeColor }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel(entry.intensity)}</Text>
          </View>
        )}
        {!!tag && (
          <View style={styles.chip}><Text style={styles.chipText}>{tag}</Text></View>
        )}
      </View>

      {editing ? (
        <>
          <TextInput style={styles.input} value={text} onChangeText={setText} multiline />
          <View style={styles.row}>
            <Pressable style={styles.button} onPress={saveEdit} disabled={busy}>
              <Text style={styles.buttonText}>{busy ? 'Saving…' : 'Save'}</Text>
            </Pressable>
            <Pressable style={styles.buttonGhost} onPress={() => { setEditing(false); setText(entry.text); }}>
              <Text style={styles.buttonGhostText}>Cancel</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.entryText}>{entry.text}</Text>
          {confirmingDelete ? (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmText}>Delete this entry? This can’t be undone.</Text>
              <View style={styles.row}>
                <Pressable style={styles.buttonDanger} onPress={deleteEntry} disabled={busy}>
                  <Text style={styles.buttonText}>{busy ? 'Deleting…' : 'Yes, delete'}</Text>
                </Pressable>
                <Pressable style={styles.buttonGhost} onPress={() => setConfirmingDelete(false)}>
                  <Text style={styles.buttonGhostText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.row}>
              <Pressable style={styles.buttonGhost} onPress={() => setEditing(true)}>
                <Text style={styles.buttonGhostText}>Edit</Text>
              </Pressable>
              <Pressable style={styles.buttonGhost} onPress={() => setConfirmingDelete(true)}>
                <Text style={[styles.buttonGhostText, { color: colors.error }]}>Delete</Text>
              </Pressable>
            </View>
          )}
        </>
      )}

      {(entry.headline || entry.body) && (
        <View style={styles.snapshot}>
          <Text style={styles.snapshotLabel}>THAT DAY&apos;S READING</Text>
          {!!entry.headline && <Text style={styles.snapshotHeadline}>{entry.headline}</Text>}
          {!!entry.body && <Text style={styles.snapshotBody}>{entry.body}</Text>}
        </View>
      )}

      <Text style={styles.privacy}>Your journal is never shared or sold.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  back: { color: colors.accent, fontSize: 15, marginBottom: 20 },
  date: { color: colors.muted, fontSize: 13, marginBottom: 12 },
  tagRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  chip: { backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { color: colors.accent, fontSize: 12 },
  entryText: { color: colors.text, fontSize: 17, lineHeight: 25 },
  input: {
    backgroundColor: colors.surface, color: colors.text, borderRadius: 12,
    padding: 16, fontSize: 16, minHeight: 120, textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', gap: 16, marginTop: 16 },
  button: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 },
  buttonText: { color: colors.bg, fontWeight: '600' },
  buttonGhost: { paddingVertical: 12 },
  buttonGhostText: { color: colors.accent, fontWeight: '600' },
  confirmRow: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginTop: 16 },
  confirmText: { color: colors.text, fontSize: 14 },
  buttonDanger: { backgroundColor: colors.error, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 },
  snapshot: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginTop: 32 },
  snapshotLabel: { color: colors.muted, fontSize: 11, letterSpacing: 1.5, marginBottom: 10 },
  snapshotHeadline: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  snapshotBody: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  privacy: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 32 },
  spinner: { marginTop: 100 },
  error: { color: colors.error, textAlign: 'center', marginTop: 100 },
});
