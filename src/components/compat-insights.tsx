// Synastry-lite insight cards on the friend comparison screen.
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, shadow, spacing, type } from '@/constants/theme';
import { ASPECT_GLYPHS } from '@/constants/astro';
import type { CompatResult } from '@/lib/api';

export default function CompatInsights({ compat }: { compat: CompatResult | null }) {
  if (!compat) return <ActivityIndicator color={colors.accent} style={styles.spinner} />;
  return (
    <View style={styles.wrap}>
      {compat.insights.map((i) => (
        <View key={i.title} style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.title}>{i.title}</Text>
            {i.aspect && (
              <View style={styles.chip}>
                <Text style={styles.chipText}>
                  {ASPECT_GLYPHS[i.aspect] ?? ''} {i.aspect}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.body}>{i.body}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.xl },
  spinner: { marginTop: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    ...shadow.card,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  title: { fontFamily: fonts.bodySemibold, fontSize: type.body, color: colors.text, flex: 1 },
  chip: { backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs },
  chipText: { color: colors.accent, fontFamily: fonts.body, fontSize: type.caption },
  body: { fontFamily: fonts.body, fontSize: type.small, color: colors.muted, lineHeight: 21 },
});
