// A compared friend's row on the Friends tab: initial avatar, name, Big 3.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, shadow, spacing, type } from '@/constants/theme';
import { expandSign } from '@/constants/astro';
import type { Friend } from '@/types/friend';

export default function FriendRow({ friend, onPress }: { friend: Friend; onPress: () => void }) {
  const b3 = friend.guest_chart_json?.big3;
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {friend.guest_name?.[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.name}>{friend.guest_name ?? 'Friend'}</Text>
        {b3 && (
          <Text style={styles.big3}>
            ☉ {expandSign(b3.sun)} · ☽ {expandSign(b3.moon)} · ↑ {expandSign(b3.rising)}
          </Text>
        )}
      </View>
      <Text style={styles.chevron}>›</Text>
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
    marginTop: spacing.sm,
    ...shadow.card,
  },
  avatar: {
    width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
    borderWidth: 1, borderColor: colors.accent,
  },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: type.heading, color: colors.accent },
  rowBody: { flex: 1 },
  name: { fontFamily: fonts.bodySemibold, fontSize: type.body + 1, color: colors.text },
  big3: { fontFamily: fonts.body, fontSize: type.small, color: colors.muted, marginTop: 3 },
  chevron: { color: colors.muted, fontSize: 22, marginLeft: spacing.sm },
});
