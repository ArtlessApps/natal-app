// One Level section on the Learn tab: header + either a lock-to-paywall
// row or the level's lesson list.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, shadow, spacing, type } from '@/constants/theme';
import { Button, Heading } from '@/components/ui';
import { expandSign, houseOrdinal } from '@/constants/astro';
import { resolvePlacement, type Chart } from '@/lib/learn';
import type { Level } from '@/constants/lessons';

export default function LearnLevel({
  level, chart, birthTimeKnown, completed, onPressLesson, onPressLock,
}: {
  level: Level;
  chart: Chart | null;
  birthTimeKnown: boolean;
  completed: Set<string>;
  onPressLesson: (lessonId: string) => void;
  onPressLock: () => void;
}) {
  const levelDone = level.lessons.filter((l) => completed.has(l.id)).length;
  const allDone = level.lessons.length > 0 && levelDone === level.lessons.length;

  return (
    <View style={styles.level}>
      <View style={styles.header}>
        <Text style={styles.index}>LEVEL {level.index}</Text>
        {level.locked ? (
          <Text style={styles.lockTag}>LOCKED</Text>
        ) : allDone ? (
          <Text style={styles.doneTag}>DONE</Text>
        ) : null}
      </View>
      <Heading style={styles.title}>{level.title}</Heading>
      <Text style={styles.subtitle}>{level.subtitle}</Text>

      {level.locked ? (
        <Button variant="ghost" label="🔒 Unlock this level" onPress={onPressLock} />
      ) : (
        level.lessons.map((lesson) => {
          const placement = chart && lesson.planetKey
            ? resolvePlacement(chart, lesson.planetKey, birthTimeKnown)
            : null;
          const isDone = completed.has(lesson.id);
          const sub = !lesson.planetKey
            ? lesson.intro
            : placement
              ? `${expandSign(placement.signAbbr)}${placement.house ? ` · ${houseOrdinal(placement.house)} house` : ''}`
              : 'Not in your chart';
          return (
            <Pressable
              key={lesson.id}
              style={styles.row}
              onPress={() => onPressLesson(lesson.id)}
            >
              <View style={[styles.check, isDone && styles.checkDone]}>
                {isDone && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{lesson.title}</Text>
                <Text style={styles.rowSub}>{sub}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  level: { marginBottom: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  index: {
    fontFamily: fonts.bodySemibold, fontSize: type.caption, letterSpacing: 2,
    color: colors.muted,
  },
  lockTag: { fontFamily: fonts.bodySemibold, fontSize: type.caption, letterSpacing: 1, color: colors.muted },
  doneTag: { fontFamily: fonts.bodySemibold, fontSize: type.caption, letterSpacing: 1, color: colors.accent },
  title: { marginTop: spacing.xs },
  subtitle: {
    fontFamily: fonts.body, fontSize: type.small, color: colors.muted,
    marginTop: 2, marginBottom: spacing.md,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
    ...shadow.card,
  },
  check: {
    width: 24, height: 24, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.muted,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  checkDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkMark: { color: colors.bg, fontSize: 14, fontFamily: fonts.bodyBold },
  rowBody: { flex: 1 },
  rowTitle: { fontFamily: fonts.bodySemibold, fontSize: type.body, color: colors.text },
  rowSub: { fontFamily: fonts.body, fontSize: type.small, color: colors.muted, marginTop: 2 },
  chevron: { color: colors.muted, fontSize: 22, marginLeft: spacing.sm },
});
