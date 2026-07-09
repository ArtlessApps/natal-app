// PRD 4.2's journal prompt: one reflective question + inline text box.
// Saving writes a journal_entries row pre-tagged with today's transit.
// If an entry already exists for today, show it read-only instead of
// letting the user create a duplicate.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/theme';
import type { DailyDriver, DailyReading } from '@/lib/api';

type Props = {
  userId: string;
  entryDate: string; // YYYY-MM-DD, same date sent to /daily
  prompt: string;
  type: DailyReading['type'];
  driver: DailyDriver;
  contentId: number | null;
  headline: string | null;
  body: string;
};

export default function JournalPrompt({
  userId, entryDate, prompt, type, driver, contentId, headline, body,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('journal_entries')
      .select('text')
      .eq('user_id', userId)
      .eq('entry_date', entryDate)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setText(data.text);
          setSaved(true);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, entryDate]);

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    setError('');
    const { error: dbError } = await supabase.from('journal_entries').insert({
      user_id: userId,
      entry_date: entryDate,
      text: text.trim(),
      transit_planet: driver.transit_planet,
      natal_planet: driver.natal_planet,
      aspect: driver.aspect,
      intensity: type,
      phase: driver.phase,
      headline,
      body,
      content_id: contentId,
    });
    setSaving(false);
    if (dbError) setError(dbError.message);
    else setSaved(true);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>TODAY'S PROMPT</Text>
      <Text style={styles.prompt}>{prompt}</Text>
      {loading ? (
        <ActivityIndicator color={colors.accent} style={styles.spinner} />
      ) : saved ? (
        <View style={styles.savedBox}>
          <Text style={styles.savedText}>{text}</Text>
          <Text style={styles.savedNote}>Saved to your journal.</Text>
        </View>
      ) : (
        <>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Write a few lines…"
            placeholderTextColor={colors.muted}
            multiline
          />
          <Pressable
            style={[styles.button, (!text.trim() || saving) && styles.buttonDisabled]}
            onPress={save}
            disabled={!text.trim() || saving}
          >
            <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save entry'}</Text>
          </Pressable>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 28 },
  label: { color: colors.muted, fontSize: 12, letterSpacing: 1.5, marginBottom: 8 },
  prompt: { color: colors.text, fontSize: 17, fontWeight: '600', lineHeight: 24, marginBottom: 14 },
  spinner: { marginTop: 8 },
  input: {
    backgroundColor: colors.surface, color: colors.text, borderRadius: 12,
    padding: 16, fontSize: 15, minHeight: 90, textAlignVertical: 'top',
  },
  button: { backgroundColor: colors.accent, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.bg, fontWeight: '600' },
  error: { color: colors.error, marginTop: 10 },
  savedBox: { backgroundColor: colors.surface, borderRadius: 12, padding: 16 },
  savedText: { color: colors.text, fontSize: 15, lineHeight: 21 },
  savedNote: { color: colors.muted, fontSize: 12, marginTop: 10 },
});
