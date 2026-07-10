// Lesson detail (PRD §4.4): the user's own placement + the long-form reading
// from content_natal, with a "mark complete" toggle that feeds the
// "% of your chart you can read" progress on the Learn tab.
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { expandSign, houseOrdinal, PLANET_GLYPHS } from '@/constants/astro';
import { findLesson } from '@/constants/lessons';
import {
  fetchNatalContent, getChart, getCompletedLessonIds, resolvePlacement, setLessonComplete,
  type Placementish,
} from '@/lib/learn';

export default function LessonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const found = findLesson(id);

  const [placement, setPlacement] = useState<Placementish | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // No setLoading(false) needed here: the "Lesson not found" render branch
    // below checks `!found` before it ever checks `loading`, so it always
    // short-circuits first regardless of loading's value.
    if (!found) return;
    let active = true;
    (async () => {
      try {
        const [{ chart, birthTimeKnown }, completed] = await Promise.all([
          getChart(),
          getCompletedLessonIds(),
        ]);
        if (!active) return;
        setDone(completed.has(found.lesson.id));
        if (chart && found.lesson.planetKey) {
          const pl = resolvePlacement(chart, found.lesson.planetKey, birthTimeKnown);
          setPlacement(pl);
          if (pl) {
            const text = await fetchNatalContent(found.lesson.planetKey, pl.signFull, pl.house);
            if (active) setContent(text);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/learn');
  }

  async function toggleDone() {
    if (!found) return;
    const next = !done;
    setBusy(true);
    setDone(next); // optimistic
    try {
      await setLessonComplete(found.lesson.id, next);
    } catch (e) {
      setDone(!next); // revert
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  if (!found) {
    return (
      <View style={[styles.wrap, styles.center]}>
        <Text style={styles.error}>Lesson not found.</Text>
        <Pressable onPress={() => router.replace('/(tabs)/learn')}>
          <Text style={styles.back}>← Learn</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.wrap, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const { lesson, level } = found;
  const isStatic = !lesson.planetKey;
  const glyph = lesson.planetKey ? (PLANET_GLYPHS[lesson.planetKey] ?? '✦') : '✦';

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.container}>
      <Pressable onPress={goBack}><Text style={styles.back}>← Learn</Text></Pressable>

      <Text style={styles.eyebrow}>LEVEL {level.index} · {level.title.toUpperCase()}</Text>
      <Text style={styles.title}>{lesson.title}</Text>

      {!isStatic && (placement ? (
        <View style={styles.placementCard}>
          <Text style={styles.glyph}>{glyph}</Text>
          <Text style={styles.placementSign}>{expandSign(placement.signAbbr)}</Text>
          <Text style={styles.placementMeta}>
            {placement.house ? `${houseOrdinal(placement.house)} house` : 'House unknown'}
            {placement.retrograde ? ' · retrograde' : ''}
          </Text>
          {placement.approximate && !placement.house && (
            <Text style={styles.caveat}>Approximate — birth time unknown</Text>
          )}
        </View>
      ) : (
        <View style={styles.placementCard}>
          <Text style={styles.placementMeta}>This placement isn’t in your chart.</Text>
        </View>
      ))}

      <Text style={styles.intro}>{lesson.intro}</Text>

      {isStatic ? (
        <Text style={styles.body}>{lesson.body}</Text>
      ) : content ? (
        <Text style={styles.body}>{content}</Text>
      ) : (
        placement && (
          <Text style={styles.pending}>
            A deeper reading for this exact placement is coming soon.
          </Text>
        )
      )}

      <Pressable
        style={[styles.button, done && styles.buttonDone]}
        onPress={toggleDone}
        disabled={busy}
      >
        <Text style={[styles.buttonText, done && styles.buttonDoneText]}>
          {busy ? 'Saving…' : done ? '✓ Completed — tap to undo' : 'Mark as read'}
        </Text>
      </Pressable>

      {!!error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center', gap: 16 },
  container: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  back: { color: colors.accent, fontSize: 15, marginBottom: 20 },
  eyebrow: { color: colors.muted, fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', marginTop: 6, marginBottom: 20 },

  placementCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 24 },
  glyph: { color: colors.accent, fontSize: 34 },
  placementSign: { color: colors.text, fontSize: 26, fontWeight: '700', marginTop: 6 },
  placementMeta: { color: colors.muted, fontSize: 14, marginTop: 4 },
  caveat: { color: colors.accent, fontSize: 12, marginTop: 8 },

  intro: { color: colors.text, fontSize: 17, lineHeight: 25, marginBottom: 16 },
  body: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  pending: { color: colors.muted, fontSize: 14, lineHeight: 21, fontStyle: 'italic' },

  button: {
    backgroundColor: colors.accent, borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 32,
  },
  buttonDone: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accent },
  buttonText: { color: colors.bg, fontWeight: '700', fontSize: 16 },
  buttonDoneText: { color: colors.accent },

  error: { color: colors.error, textAlign: 'center', marginTop: 16 },
});
