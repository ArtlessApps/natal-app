// Friend comparison (PRD §4.5): side-by-side Big 3 + synastry-lite insights,
// a shareable card, and delete.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { Button, Caption, Title } from '@/components/ui';
import Big3CompareCard from '@/components/big3-compare-card';
import CompatInsights from '@/components/compat-insights';
import ConfirmDelete from '@/components/confirm-delete';
import { useFriendComparison } from '@/lib/use-friend-comparison';

export default function FriendComparison() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    friend, ownerName, compat, loading, error,
    confirmingDelete, setConfirmingDelete, busy,
    cardRef, sharing, share, remove, goBack,
  } = useFriendComparison(id);

  if (error && !friend) {
    return (
      <View style={[styles.wrap, styles.center]}>
        <Caption style={styles.error}>{error}</Caption>
        <Pressable onPress={() => router.replace('/(tabs)/friends')}>
          <Text style={styles.back}>← Connections</Text>
        </Pressable>
      </View>
    );
  }

  if (loading || !friend) {
    return (
      <View style={[styles.wrap, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // Guaranteed present here (pending/chartless rows bail out above), but the
  // type is nullable since Step 8.6 — fall back defensively for the compiler.
  const guestName = friend.guest_name ?? 'Connection';

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.container}>
      <Pressable onPress={goBack}><Text style={styles.back}>← Connections</Text></Pressable>
      <Title style={styles.title}>{ownerName} & {guestName}</Title>

      <Big3CompareCard
        ref={cardRef}
        nameA={ownerName}
        big3A={compat?.big3_a ?? null}
        nameB={guestName}
        big3B={compat?.big3_b ?? friend.guest_chart_json?.big3 ?? null}
      />

      <Button
        variant="ghost"
        label={sharing ? 'Preparing…' : 'Share this card'}
        onPress={share}
        disabled={sharing}
        style={styles.shareBtn}
      />

      <CompatInsights compat={compat} />

      {confirmingDelete ? (
        <ConfirmDelete
          message={`Remove ${guestName}?`}
          confirmLabel={busy ? 'Removing…' : 'Yes, remove'}
          busy={busy}
          onConfirm={remove}
          onCancel={() => setConfirmingDelete(false)}
        />
      ) : (
        <Pressable style={styles.removeLink} onPress={() => setConfirmingDelete(true)}>
          <Caption style={styles.removeText}>Remove Connection</Caption>
        </Pressable>
      )}

      {!!error && <Caption style={styles.error}>{error}</Caption>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  container: { padding: spacing.lg, paddingTop: 60, paddingBottom: spacing.xxl },
  back: { color: colors.accent, fontSize: 15, marginBottom: spacing.lg },
  title: { marginBottom: spacing.lg },
  shareBtn: { marginTop: spacing.md },
  removeLink: { alignItems: 'center', marginTop: spacing.xl },
  removeText: { color: colors.error },
  error: { color: colors.error, textAlign: 'center', marginTop: spacing.md },
});
