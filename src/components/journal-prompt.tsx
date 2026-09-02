// PRD 4.2's journal prompt: one reflective question + inline text box.
// Saving writes a journal_entries row pre-tagged with today's transit.
// If an entry already exists for today, show it read-only instead of
// letting the user create a duplicate.
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius, spacing, type } from '@/constants/theme';
import type { DailyDriver, DailyReading } from '@/lib/api';

type Props = {
  userId: string;
  entryDate: string; // YYYY-MM-DD, same date sent to /daily
  prompt: string;
  // Named for the journal_entries column it lands in — the theme's type
  // scale owns the name `type` in this file.
  intensity: DailyReading['type'];
  driver: DailyDriver;
  contentId: number | null;
  headline: string | null;
  body: string;
  style?: StyleProp<ViewStyle>;
};

export default function JournalPrompt({
  userId, entryDate, prompt, intensity, driver, contentId, headline, body, style,
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
      intensity,
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
    <View style={[styles.wrap, style]}>
      <Text style={styles.label}>TODAY&apos;S PROMPT</Text>
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
  label: {
    fontFamily: fonts.bodySemibold,
    color: colors.goldDeep,
    fontSize: type.eyebrow,
    letterSpacing: 2.5,
    marginBottom: spacing.sm,
  },
  prompt: {
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: type.heading,
    lineHeight: 27,
    marginBottom: spacing.md,
  },
  spinner: { marginTop: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: type.body,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { fontFamily: fonts.bodySemibold, color: colors.bg, fontSize: type.body },
  error: { fontFamily: fonts.body, color: colors.error, marginTop: 10 },
  savedBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  savedText: { fontFamily: fonts.body, color: colors.text, fontSize: type.small + 1, lineHeight: 21 },
  savedNote: { fontFamily: fonts.body, color: colors.muted, fontSize: type.caption, marginTop: 10 },
});
