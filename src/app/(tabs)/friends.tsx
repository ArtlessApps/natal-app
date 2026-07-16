// Friends tab (PRD §4.5 + MONETIZATION §4.3): invite someone to compare
// charts, or add their details manually. Free = 1 Connection; adding #2+
// opens the shared PaywallSheet. Plus raises the cap to MAX_FRIENDS.
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Platform, Share, StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { Caption, Tagline } from '@/components/ui';
import FriendRow from '@/components/friend-row';
import FriendsHeader from '@/components/friends-header';
import PaywallSheet from '@/components/PaywallSheet';
import { WEB_URL } from '@/constants/links';
import {
  createInvite,
  deleteFriend,
  FREE_CONNECTION_LIMIT,
  listFriends,
  MAX_FRIENDS,
} from '@/lib/friends';
import { useIsPlus } from '@/lib/subscription';
import type { Friend } from '@/types/friend';

async function shareInviteLink(token: string) {
  const message = `Let’s compare birth charts ✦ ${WEB_URL}/invite/${token}`;
  if (Platform.OS === 'web') {
    const nav = globalThis.navigator as any;
    if (nav?.share) await nav.share({ text: message });
    else if (nav?.clipboard) await nav.clipboard.writeText(message);
    return;
  }
  await Share.share({ message });
}

export default function FriendsScreen() {
  const router = useRouter();
  const isPlus = useIsPlus();
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [error, setError] = useState('');
  const [paywall, setPaywall] = useState(false);

  const load = useCallback(() => {
    setError('');
    listFriends()
      .then((rows) => setFriends(rows))
      .catch((e) => { setError(e.message ?? 'Could not load Connections'); setFriends([]); });
  }, []);

  useFocusEffect(load);

  const pending = friends?.filter((f) => f.status === 'pending') ?? [];
  const completed = friends?.filter((f) => f.status !== 'pending') ?? [];
  const count = friends?.length ?? 0;
  // Free: 1 Connection. Plus: hard ceiling. Pendings count toward the cap.
  const limit = isPlus ? MAX_FRIENDS : FREE_CONNECTION_LIMIT;
  const atLimit = count >= limit;

  function gateOr(run: () => void) {
    // Button stays visible at the free limit — tap opens paywall (MONETIZATION §4).
    if (atLimit && !isPlus) {
      setPaywall(true);
      return;
    }
    run();
  }

  async function inviteSomeone() {
    setError('');
    try {
      const invite = await createInvite();
      await shareInviteLink(invite.token);
      load();
    } catch (e: any) {
      setError(e.message ?? 'Could not create invite');
    }
  }

  async function resend(token: string) {
    try { await shareInviteLink(token); } catch { /* user cancelled */ }
  }

  async function removeRow(id: string) {
    setError('');
    try { await deleteFriend(id); load(); }
    catch (e: any) { setError(e.message ?? 'Could not remove'); }
  }

  return (
    <View style={styles.wrap}>
      <FlatList
        data={completed}
        keyExtractor={(f) => f.id}
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <FriendsHeader
            friends={friends}
            pending={pending}
            completedCount={completed.length}
            count={count}
            limit={limit}
            atLimit={atLimit && !isPlus}
            onInvite={() => gateOr(inviteSomeone)}
            onResend={resend}
            onRemove={removeRow}
            onAddManually={() => gateOr(() => router.push('/friends/add'))}
            onUpgrade={() => setPaywall(true)}
          />
        }
        renderItem={({ item }) => (
          <FriendRow friend={item} onPress={() => router.push(`/friends/${item.id}`)} />
        )}
        ListEmptyComponent={
          friends === null ? (
            <ActivityIndicator color={colors.accent} style={styles.spinner} />
          ) : pending.length === 0 ? (
            <Tagline style={styles.empty}>
              Send someone a link — they add their own details, you both see how your skies fit.
            </Tagline>
          ) : null
        }
      />
      {!!error && <Caption style={styles.error}>{error}</Caption>}

      <PaywallSheet
        visible={paywall}
        source="connection_limit"
        onClose={() => setPaywall(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingTop: 70, paddingBottom: spacing.xxl },
  empty: { textAlign: 'center', marginTop: spacing.xl },
  spinner: { marginTop: spacing.xxl },
  error: { color: colors.error, textAlign: 'center', padding: spacing.md },
});
