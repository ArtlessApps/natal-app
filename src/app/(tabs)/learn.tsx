// Learn tab (PRD §4.4): guided path from Big 3 → full chart fluency.
// Levels 1–2 are free and read from the user's own chart; Levels 3–5 are
// locked behind a paywall stub. Progress is framed as
// "% of your chart you can read".
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing, type } from '@/constants/theme';
import { Body, Caption, Card, Title } from '@/components/ui';
import LearnLevel from '@/components/learn-level';
import { ALL_UNLOCKABLE_LESSONS, LEVELS } from '@/constants/lessons';
import { getChart, getCompletedLessonIds, type Chart } from '@/lib/learn';

export default function LearnScreen() {
  const router = useRouter();
  const [chart, setChart] = useState<Chart | null>(null);
  const [birthTimeKnown, setBirthTimeKnown] = useState(true);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    let active = true;
    Promise.all([getChart(), getCompletedLessonIds()])
      .then(([{ chart: c, birthTimeKnown: bt }, done]) => {
        if (!active) return;
        setChart(c);
        setBirthTimeKnown(bt);
        setCompleted(done);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useFocusEffect(load);

  if (loading) {
    return (
      <View style={[styles.wrap, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const doneCount = ALL_UNLOCKABLE_LESSONS.filter((l) => completed.has(l.id)).length;
  const pct = ALL_UNLOCKABLE_LESSONS.length
    ? Math.round((doneCount / ALL_UNLOCKABLE_LESSONS.length) * 100)
    : 0;

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.container}>
      <Title>Learn</Title>
      <Body style={styles.subtitle}>From your Big 3 to your whole chart, one placement at a time.</Body>

      <Card style={styles.progressCard}>
        <Text style={styles.progressPct}>{pct}%</Text>
        <Body style={styles.progressLabel}>of your chart you can read</Body>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        <Caption style={styles.progressCount}>{doneCount} of {ALL_UNLOCKABLE_LESSONS.length} lessons complete</Caption>
      </Card>

      {LEVELS.map((level) => (
        <LearnLevel
          key={level.id}
          level={level}
          chart={chart}
          birthTimeKnown={birthTimeKnown}
          completed={completed}
          onPressLesson={(lessonId) => router.push(`/learn/${lessonId}`)}
          onPressLock={() => router.push(`/learn/paywall?reason=${level.id}`)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  container: { padding: spacing.lg, paddingTop: 70, paddingBottom: spacing.xxl },
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.lg },

  progressCard: { marginBottom: spacing.xl },
  progressPct: { fontFamily: fonts.bodyBold, fontSize: type.hero, color: colors.accent },
  progressLabel: { marginTop: 2 },
  progressTrack: { height: 8, backgroundColor: colors.bg, borderRadius: 999, marginTop: spacing.md, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: colors.accent, borderRadius: 999 },
  progressCount: { marginTop: spacing.sm },
});
