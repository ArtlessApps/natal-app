// Friends tab (PRD §4.5): guest charts you've added, tap to compare.
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { expandSign } from '@/constants/astro';
import { FREE_FRIEND_LIMIT, listFriends } from '@/lib/friends';
import type { Friend } from '@/types/friend';

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

  const count = friends?.length ?? 0;
  const atLimit = count >= FREE_FRIEND_LIMIT;

  return (
    <View style={styles.wrap}>
      <FlatList
        data={friends ?? []}
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
                <Text style={styles.name}>{item.guest_name}</Text>
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
          ) : (
            <Text style={styles.empty}>
              No friends yet. Add someone’s birth details to compare your charts.
            </Text>
          )
        }
        ListFooterComponent={
          friends === null ? null : (
            <View style={styles.footer}>
              {atLimit ? (
                <>
                  <Pressable style={[styles.addBtn, styles.addBtnDisabled]} disabled>
                    <Text style={styles.addBtnText}>Add a friend</Text>
                  </Pressable>
                  <Text style={styles.limitNote}>
                    You’ve reached the free limit of {FREE_FRIEND_LIMIT} friends.
                  </Text>
                </>
              ) : (
                <Pressable style={styles.addBtn} onPress={() => router.push('/friends/add')}>
                  <Text style={styles.addBtnText}>Add a friend</Text>
                </Pressable>
              )}
            </View>
          )
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
  footer: { marginTop: 24 },
  addBtn: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center' },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: colors.bg, fontWeight: '700', fontSize: 16 },
  limitNote: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 10 },
  error: { color: colors.error, textAlign: 'center', padding: 16 },
});
