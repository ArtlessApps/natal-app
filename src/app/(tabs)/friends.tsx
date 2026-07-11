// Friends tab (PRD §4.5): invite someone to compare charts, or add their
// details manually. Since Step 8.6 the primary flow is a share link — a
// pending invite row appears under WAITING until the guest completes the web
// flow, then flips to COMPARED.
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Platform, Share, StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { Caption, Tagline } from '@/components/ui';
import FriendRow from '@/components/friend-row';
import FriendsHeader from '@/components/friends-header';
import { WEB_URL } from '@/constants/links';
import { createInvite, deleteFriend, FREE_FRIEND_LIMIT, listFriends } from '@/lib/friends';
import type { Friend } from '@/types/friend';

// One place to build + open the invite link, web-aware so the "app in one
// browser tab" local test works (native uses the OS share sheet).
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
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    listFriends()
      .then((rows) => setFriends(rows))
      .catch((e) => { setError(e.message ?? 'Could not load friends'); setFriends([]); });
  }, []);

  useFocusEffect(load);

  const pending = friends?.filter((f) => f.status === 'pending') ?? [];
  const completed = friends?.filter((f) => f.status !== 'pending') ?? [];
  const count = friends?.length ?? 0;
  const atLimit = count >= FREE_FRIEND_LIMIT; // pendings count toward the cap

  async function inviteSomeone() {
    setError('');
    try {
      const invite = await createInvite(); // token comes back from Postgres
      await shareInviteLink(invite.token);
      load(); // pending row appears immediately
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
            limit={FREE_FRIEND_LIMIT}
            atLimit={atLimit}
            onInvite={inviteSomeone}
            onResend={resend}
            onRemove={removeRow}
            onAddManually={() => router.push('/friends/add')}
            onUpgrade={() => router.push('/learn/paywall?reason=friends')}
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
