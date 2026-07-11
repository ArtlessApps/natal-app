// Lesson detail (PRD §4.4): the user's own placement + the long-form reading
// from content_natal, with a "mark complete" toggle that feeds the
// "% of your chart you can read" progress on the Learn tab.
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { Body, Button, Caption, Eyebrow, Tagline, Title } from '@/components/ui';
import LessonPlacementCard from '@/components/lesson-placement-card';
import { PLANET_GLYPHS } from '@/constants/astro';
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
        <Caption style={styles.error}>Lesson not found.</Caption>
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

      <Eyebrow>Level {level.index} · {level.title}</Eyebrow>
      <Title style={styles.title}>{lesson.title}</Title>

      {!isStatic && <LessonPlacementCard glyph={glyph} placement={placement} />}

      <Body style={styles.intro}>{lesson.intro}</Body>

      {isStatic ? (
        <Body>{lesson.body}</Body>
      ) : content ? (
        <Body>{content}</Body>
      ) : (
        placement && (
          <Tagline style={styles.pending}>
            A deeper reading for this exact placement is coming soon.
          </Tagline>
        )
      )}

      <Button
        variant={done ? 'ghost' : 'primary'}
        label={busy ? 'Saving…' : done ? '✓ Completed — tap to undo' : 'Mark as read'}
        onPress={toggleDone}
        disabled={busy}
        style={styles.button}
      />

      {!!error && <Caption style={styles.error}>{error}</Caption>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  container: { padding: spacing.lg, paddingTop: 60, paddingBottom: spacing.xxl },
  back: { color: colors.accent, fontSize: 15, marginBottom: spacing.lg },
  title: { marginTop: spacing.xs, marginBottom: spacing.lg },
  intro: { marginBottom: spacing.md },
  pending: { marginTop: spacing.xs },
  button: { marginTop: spacing.xl },
  error: { color: colors.error, textAlign: 'center', marginTop: spacing.md },
});
