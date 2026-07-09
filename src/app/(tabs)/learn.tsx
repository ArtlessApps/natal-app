// Learn tab (PRD §4.4): guided path from Big 3 → full chart fluency.
// Levels 1–2 are free and read from the user's own chart; Levels 3–5 are
// locked behind a paywall stub. Progress is framed as
// "% of your chart you can read".
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { ALL_UNLOCKABLE_LESSONS, LEVELS } from '@/constants/lessons';
import { getChart, getCompletedLessonIds, resolvePlacement, type Chart } from '@/lib/learn';
import { expandSign, houseOrdinal } from '@/constants/astro';

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
      <Text style={styles.title}>Learn</Text>
      <Text style={styles.subtitle}>From your Big 3 to your whole chart, one placement at a time.</Text>

      <View style={styles.progressCard}>
        <Text style={styles.progressPct}>{pct}%</Text>
        <Text style={styles.progressLabel}>of your chart you can read</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.progressCount}>{doneCount} of {ALL_UNLOCKABLE_LESSONS.length} lessons complete</Text>
      </View>

      {LEVELS.map((level) => {
        const levelDone = level.lessons.filter((l) => completed.has(l.id)).length;
        return (
          <View key={level.id} style={styles.level}>
            <View style={styles.levelHeader}>
              <Text style={styles.levelIndex}>LEVEL {level.index}</Text>
              {level.locked ? (
                <Text style={styles.lockTag}>LOCKED</Text>
              ) : level.lessons.length > 0 && levelDone === level.lessons.length ? (
                <Text style={styles.doneTag}>DONE</Text>
              ) : null}
            </View>
            <Text style={styles.levelTitle}>{level.title}</Text>
            <Text style={styles.levelSubtitle}>{level.subtitle}</Text>

            {level.locked ? (
              <Pressable style={styles.lockRow} onPress={() => router.push('/learn/paywall')}>
                <Text style={styles.lockRowText}>🔒 Unlock this level</Text>
              </Pressable>
            ) : (
              chart && level.lessons.map((lesson) => {
                const placement = resolvePlacement(chart, lesson.planetKey, birthTimeKnown);
                const isDone = completed.has(lesson.id);
                const sub = placement
                  ? `${expandSign(placement.signAbbr)}${placement.house ? ` · ${houseOrdinal(placement.house)} house` : ''}`
                  : 'Not in your chart';
                return (
                  <Pressable
                    key={lesson.id}
                    style={styles.lessonRow}
                    onPress={() => router.push(`/learn/${lesson.id}`)}
                  >
                    <View style={[styles.check, isDone && styles.checkDone]}>
                      {isDone && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                    <View style={styles.lessonBody}>
                      <Text style={styles.lessonTitle}>{lesson.title}</Text>
                      <Text style={styles.lessonSub}>{sub}</Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                );
              })
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  container: { padding: 24, paddingTop: 70, paddingBottom: 60 },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: colors.muted, fontSize: 14, marginBottom: 24, lineHeight: 20 },

  progressCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 28 },
  progressPct: { color: colors.accent, fontSize: 40, fontWeight: '800' },
  progressLabel: { color: colors.text, fontSize: 15, marginTop: 2 },
  progressTrack: { height: 8, backgroundColor: colors.bg, borderRadius: 999, marginTop: 16, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: colors.accent, borderRadius: 999 },
  progressCount: { color: colors.muted, fontSize: 12, marginTop: 10 },

  level: { marginBottom: 28 },
  levelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  levelIndex: { color: colors.muted, fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  lockTag: { color: colors.muted, fontSize: 11, letterSpacing: 1, fontWeight: '700' },
  doneTag: { color: colors.accent, fontSize: 11, letterSpacing: 1, fontWeight: '700' },
  levelTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 4 },
  levelSubtitle: { color: colors.muted, fontSize: 13, marginTop: 2, marginBottom: 12 },

  lessonRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 12, padding: 14, marginTop: 8,
  },
  check: {
    width: 24, height: 24, borderRadius: 999, borderWidth: 1.5, borderColor: colors.muted,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  checkDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkMark: { color: colors.bg, fontSize: 14, fontWeight: '800' },
  lessonBody: { flex: 1 },
  lessonTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  lessonSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  chevron: { color: colors.muted, fontSize: 22, marginLeft: 8 },

  lockRow: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginTop: 8,
    borderWidth: 1, borderColor: colors.surface,
  },
  lockRowText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
});
