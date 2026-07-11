// Journal entry detail (PRD 4.3): full text, that day's reading snapshot,
// edit/delete. Reached by tapping a row in the Journal tab.
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius, spacing, type } from '@/constants/theme';
import { Body, Button, Caption } from '@/components/ui';
import ConfirmDelete from '@/components/confirm-delete';
import JournalTagRow from '@/components/journal-tag-row';
import ReadingSnapshot from '@/components/reading-snapshot';
import { BADGE_COLORS, transitTag } from '@/constants/astro';
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

  if (error) return <Caption style={styles.error}>{error}</Caption>;
  if (!entry) return <ActivityIndicator color={colors.accent} style={styles.spinner} />;

  const tag = transitTag(entry.transit_planet, entry.aspect, entry.natal_planet);
  const badgeColor = entry.intensity ? BADGE_COLORS[entry.intensity] : colors.muted;

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.container}>
      <Pressable onPress={goToJournalList}><Text style={styles.back}>← Journal</Text></Pressable>

      <Caption style={styles.date}>
        {new Date(`${entry.entry_date}T12:00:00`).toLocaleDateString(undefined, {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        })}
      </Caption>

      <JournalTagRow intensity={entry.intensity} badgeColor={badgeColor} tag={tag} />

      {editing ? (
        <>
          <TextInput style={styles.input} value={text} onChangeText={setText} multiline />
          <View style={styles.row}>
            <Button label={busy ? 'Saving…' : 'Save'} onPress={saveEdit} disabled={busy} />
            <Button variant="ghost" label="Cancel" onPress={() => { setEditing(false); setText(entry.text); }} />
          </View>
        </>
      ) : (
        <>
          <Body style={styles.entryText}>{entry.text}</Body>
          {confirmingDelete ? (
            <ConfirmDelete
              message="Delete this entry? This can’t be undone."
              confirmLabel={busy ? 'Deleting…' : 'Yes, delete'}
              busy={busy}
              onConfirm={deleteEntry}
              onCancel={() => setConfirmingDelete(false)}
            />
          ) : (
            <View style={styles.row}>
              <Button variant="ghost" label="Edit" onPress={() => setEditing(true)} />
              <Button variant="ghost" label="Delete" onPress={() => setConfirmingDelete(true)} labelColor={colors.error} />
            </View>
          )}
        </>
      )}

      {(entry.headline || entry.body) && (
        <ReadingSnapshot headline={entry.headline} body={entry.body} />
      )}

      <Caption style={styles.privacy}>Your journal is never shared or sold.</Caption>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingTop: 60, paddingBottom: spacing.xxl },
  back: { color: colors.accent, fontFamily: fonts.bodyMedium, fontSize: type.small, marginBottom: spacing.lg },
  date: { marginBottom: spacing.md },
  entryText: { color: colors.text, fontSize: 17, lineHeight: 25 },
  input: {
    backgroundColor: colors.surface, color: colors.text, fontFamily: fonts.body, fontSize: type.body,
    borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
    padding: spacing.md, minHeight: 120, textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  privacy: { textAlign: 'center', marginTop: spacing.xl },
  spinner: { marginTop: 100 },
  error: { color: colors.error, textAlign: 'center', marginTop: 100 },
});
