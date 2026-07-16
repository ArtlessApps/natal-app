// Tappable locked-feature row used for contextual Plus gates that don't
// have a real screen yet (transit calendar, pattern insights).
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, shadow, spacing, type } from '@/constants/theme';

export default function LockedFeatureRow({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole="button">
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.lock}>🔒</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadow.card,
  },
  body: { flex: 1 },
  title: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.body,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: type.small,
    color: colors.muted,
    marginTop: 2,
  },
  lock: { fontSize: 16, marginLeft: spacing.sm },
});
