// Friends tab header: title/subtitle, the invite CTA (or the free-limit
// note), and the WAITING section of pending invites. Rendered as the
// FlatList's ListHeaderComponent so it scrolls with the compared list.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing, type } from '@/constants/theme';
import { Body, Button, Caption, Eyebrow, Title } from '@/components/ui';
import type { Friend } from '@/types/friend';

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function FriendsHeader({
  friends, pending, completedCount, count, limit, atLimit,
  onInvite, onResend, onRemove, onAddManually, onUpgrade,
}: {
  friends: Friend[] | null;
  pending: Friend[];
  completedCount: number;
  count: number;
  limit: number;
  atLimit: boolean;
  onInvite: () => void;
  onResend: (token: string) => void;
  onRemove: (id: string) => void;
  onAddManually: () => void;
  onUpgrade: () => void;
}) {
  return (
    <>
      <Title>Your Connections</Title>
      <Body style={styles.subtitle}>Compare charts with a Connection and see how you fit together.</Body>
      {friends !== null && (
        <Caption style={styles.count}>{count} of {limit} Connections</Caption>
      )}

      {friends !== null && (
        <View style={styles.cta}>
          {/* Stays tappable at the free limit — parent opens the paywall. */}
          <Button
            label="✦  Invite someone to compare"
            onPress={onInvite}
            variant="terracotta"
          />
          {atLimit ? (
            <View>
              <Caption style={styles.limitNote}>
                You’ve used your free Connection. Unlock unlimited with Natal Plus.
              </Caption>
              <Text style={styles.limitLink} onPress={onUpgrade}>
                Unlock with Natal Plus →
              </Text>
            </View>
          ) : (
            <Text style={styles.manualLink} onPress={onAddManually}>
              Add their details manually
            </Text>
          )}
        </View>
      )}

      {pending.length > 0 && (
        <>
          <Eyebrow style={styles.sectionLabel}>Waiting</Eyebrow>
          {pending.map((item) => (
            <View key={item.id} style={styles.pendingRow}>
              <View style={styles.pendingDot} />
              <Text style={styles.pendingText}>Invite sent · {shortDate(item.created_at)}</Text>
              <Pressable onPress={() => onResend(item.token)} hitSlop={8}>
                <Text style={styles.resend}>Resend</Text>
              </Pressable>
              <Pressable onPress={() => onRemove(item.id)} hitSlop={8}>
                <Text style={styles.remove}>×</Text>
              </Pressable>
            </View>
          ))}
        </>
      )}

      {completedCount > 0 && <Eyebrow style={styles.sectionLabel}>Compared</Eyebrow>}
    </>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.sm },
  count: { marginBottom: spacing.sm },
  cta: { marginBottom: spacing.xs },
  manualLink: {
    fontFamily: fonts.bodyMedium, fontSize: type.small, color: colors.accent,
    textAlign: 'center', marginTop: spacing.md,
  },
  limitNote: { textAlign: 'center', marginTop: spacing.sm },
  limitLink: {
    fontFamily: fonts.bodySemibold, fontSize: type.small, color: colors.accent,
    textAlign: 'center', marginTop: spacing.sm,
  },
  sectionLabel: { marginTop: spacing.xl, marginBottom: spacing.xs },
  pendingRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
    padding: spacing.md, marginTop: spacing.sm, gap: spacing.sm,
  },
  pendingDot: {
    width: 12, height: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.muted,
  },
  pendingText: { fontFamily: fonts.body, fontSize: type.small, color: colors.muted, flex: 1 },
  resend: { fontFamily: fonts.bodySemibold, fontSize: type.small, color: colors.accent },
  remove: { color: colors.muted, fontSize: 22, lineHeight: 22 },
});
