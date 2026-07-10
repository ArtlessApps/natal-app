// Friends tab (PRD §4.5): invite someone to compare charts, or add their
// details manually. Since Step 8.6 the primary flow is a share link — a
// pending invite row appears under WAITING until the guest completes the web
// flow, then flips to COMPARED.
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator, FlatList, Platform, Pressable, Share, StyleSheet, Text, View,
} from 'react-native';
import { colors } from '@/constants/theme';
import { expandSign } from '@/constants/astro';
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

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

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
          <>
            <Text style={styles.title}>Friends</Text>
            <Text style={styles.subtitle}>
              Add someone’s chart and see how you fit together.
            </Text>
            {friends !== null && (
              <Text style={styles.count}>{count} of {FREE_FRIEND_LIMIT} friends</Text>
            )}

            {friends !== null && (
              <View style={styles.cta}>
                <Pressable
                  style={[styles.inviteBtn, atLimit && styles.inviteBtnDisabled]}
                  onPress={inviteSomeone}
                  disabled={atLimit}
                >
                  <Text style={styles.inviteBtnText}>✦  Invite someone to compare</Text>
                </Pressable>
                {atLimit ? (
                  <Text style={styles.limitNote}>
                    You’ve reached the free limit of {FREE_FRIEND_LIMIT} friends. Remove one to invite more.
                  </Text>
                ) : (
                  <Pressable onPress={() => router.push('/friends/add')}>
                    <Text style={styles.manualLink}>Add their details manually</Text>
                  </Pressable>
                )}
              </View>
            )}

            {pending.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>WAITING</Text>
                {pending.map((item) => (
                  <View key={item.id} style={styles.pendingRow}>
                    <View style={styles.pendingDot} />
                    <Text style={styles.pendingText}>Invite sent · {shortDate(item.created_at)}</Text>
                    <Pressable onPress={() => resend(item.token)} hitSlop={8}>
                      <Text style={styles.resend}>Resend</Text>
                    </Pressable>
                    <Pressable onPress={() => removeRow(item.id)} hitSlop={8}>
                      <Text style={styles.remove}>×</Text>
                    </Pressable>
                  </View>
                ))}
              </>
            )}

            {completed.length > 0 && <Text style={styles.sectionLabel}>COMPARED</Text>}
          </>
        }
        renderItem={({ item }) => {
          const b3 = item.guest_chart_json?.big3;
          return (
            <Pressable style={styles.row} onPress={() => router.push(`/friends/${item.id}`)}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.guest_name?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.name}>{item.guest_name ?? 'Friend'}</Text>
                {b3 && (
                  <Text style={styles.big3}>
                    ☉ {expandSign(b3.sun)} · ☽ {expandSign(b3.moon)} · ↑ {expandSign(b3.rising)}
                  </Text>
                )}
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          friends === null ? (
            <ActivityIndicator color={colors.accent} style={styles.spinner} />
          ) : pending.length === 0 ? (
            <Text style={styles.empty}>
              Send someone a link — they add their own details, you both see how your skies fit.
            </Text>
          ) : null
        }
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 24, paddingTop: 70, paddingBottom: 60 },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: colors.muted, fontSize: 14, marginBottom: 16, lineHeight: 20 },
  count: { color: colors.muted, fontSize: 12, marginBottom: 12 },
  cta: { marginBottom: 8 },
  inviteBtn: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center' },
  inviteBtnDisabled: { opacity: 0.4 },
  inviteBtnText: { color: colors.bg, fontWeight: '700', fontSize: 16 },
  manualLink: { color: colors.accent, fontSize: 14, textAlign: 'center', marginTop: 12 },
  limitNote: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 10 },
  sectionLabel: { color: colors.muted, fontSize: 12, letterSpacing: 2, marginTop: 24, marginBottom: 4 },
  pendingRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 14, padding: 16, marginTop: 10, gap: 12,
  },
  pendingDot: {
    width: 12, height: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.muted,
  },
  pendingText: { color: colors.muted, fontSize: 14, flex: 1 },
  resend: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  remove: { color: colors.muted, fontSize: 22, lineHeight: 22 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 14, padding: 16, marginTop: 10,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 999, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
    borderWidth: 1, borderColor: colors.accent,
  },
  avatarText: { color: colors.accent, fontSize: 18, fontWeight: '700' },
  rowBody: { flex: 1 },
  name: { color: colors.text, fontSize: 17, fontWeight: '600' },
  big3: { color: colors.muted, fontSize: 13, marginTop: 3 },
  chevron: { color: colors.muted, fontSize: 22, marginLeft: 8 },
  empty: { color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 30, lineHeight: 20 },
  spinner: { marginTop: 50 },
  error: { color: colors.error, textAlign: 'center', padding: 16 },
});
