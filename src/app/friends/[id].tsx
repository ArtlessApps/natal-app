// Friend comparison (PRD §4.5): side-by-side Big 3 + synastry-lite insights,
// a shareable card, and delete.
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { colors } from '@/constants/theme';
import { ASPECT_GLYPHS } from '@/constants/astro';
import { fetchCompat, type CompatResult } from '@/lib/api';
import { deleteFriend, getFriend, getOwnerCompareData } from '@/lib/friends';
import Big3CompareCard from '@/components/big3-compare-card';
import { useShareCard } from '@/lib/use-share-card';
import type { Friend } from '@/types/friend';

export default function FriendComparison() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [friend, setFriend] = useState<Friend | null>(null);
  const [ownerName, setOwnerName] = useState('You');
  const [compat, setCompat] = useState<CompatResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  // `null` size = capture the card at its own natural on-screen dimensions
  // instead of forcing it into the 9:16 story format (see useShareCard).
  const { cardRef, share: shareImage, sharing } = useShareCard(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [f, owner] = await Promise.all([getFriend(id), getOwnerCompareData()]);
        if (!active) return;
        // A pending invite has no chart yet — treat it like a missing row.
        if (!f || f.status === 'pending' || !f.guest_chart_json || !f.guest_name) {
          setError('Friend not found.'); return;
        }
        setFriend(f);
        if (owner) {
          setOwnerName(owner.name);
          const result = await fetchCompat(owner.chart, f.guest_chart_json, owner.name, f.guest_name);
          if (active) setCompat(result);
        }
      } catch (e: any) {
        if (active) setError(e.message ?? 'Could not load comparison');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/friends');
  }

  // Native shares the rendered Big3CompareCard as a PNG (PRD §4.5). Web
  // can't reliably capture-to-image (see useShareCard), so it keeps the
  // original text share / clipboard fallback there.
  async function share() {
    if (!compat || !friend) return;
    if (Platform.OS !== 'web') {
      await shareImage();
      return;
    }
    const lines = [
      `${ownerName} & ${friend.guest_name ?? 'Friend'} — our charts, compared on Natal`,
      '',
      ...compat.insights.map((i) => `${i.title}: ${i.body}`),
    ];
    const message = lines.join('\n');
    try {
      const nav = globalThis.navigator as any;
      if (nav?.share) await nav.share({ text: message });
      else if (nav?.clipboard) { await nav.clipboard.writeText(message); setError('Copied to clipboard.'); }
    } catch {
      /* user cancelled share — no-op */
    }
  }

  async function remove() {
    if (!friend) return;
    setBusy(true);
    try {
      await deleteFriend(friend.id);
      goBack();
    } catch (e: any) {
      setError(e.message ?? 'Could not delete');
      setBusy(false);
    }
  }

  if (error && !friend) {
    return (
      <View style={[styles.wrap, styles.center]}>
        <Text style={styles.error}>{error}</Text>
        <Pressable onPress={() => router.replace('/(tabs)/friends')}>
          <Text style={styles.back}>← Friends</Text>
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
  const guestName = friend.guest_name ?? 'Friend';

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.container}>
      <Pressable onPress={goBack}><Text style={styles.back}>← Friends</Text></Pressable>
      <Text style={styles.title}>{ownerName} & {guestName}</Text>

      <Big3CompareCard
        ref={cardRef}
        nameA={ownerName}
        big3A={compat?.big3_a ?? null}
        nameB={guestName}
        big3B={compat?.big3_b ?? friend.guest_chart_json?.big3 ?? null}
      />

      <Pressable style={styles.shareBtn} onPress={share} disabled={sharing}>
        <Text style={styles.shareBtnText}>{sharing ? 'Preparing…' : 'Share this card'}</Text>
      </Pressable>

      {compat ? (
        <View style={styles.insights}>
          {compat.insights.map((i) => (
            <View key={i.title} style={styles.insight}>
              <View style={styles.insightHead}>
                <Text style={styles.insightTitle}>{i.title}</Text>
                {i.aspect && (
                  <View style={styles.aspectChip}>
                    <Text style={styles.aspectText}>
                      {ASPECT_GLYPHS[i.aspect] ?? ''} {i.aspect}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.insightBody}>{i.body}</Text>
            </View>
          ))}
        </View>
      ) : (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      )}

      {confirmingDelete ? (
        <View style={styles.confirm}>
          <Text style={styles.confirmText}>Remove {guestName}?</Text>
          <View style={styles.confirmRow}>
            <Pressable style={styles.dangerBtn} onPress={remove} disabled={busy}>
              <Text style={styles.dangerText}>{busy ? 'Removing…' : 'Yes, remove'}</Text>
            </Pressable>
            <Pressable style={styles.ghostBtn} onPress={() => setConfirmingDelete(false)}>
              <Text style={styles.ghostText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.removeLink} onPress={() => setConfirmingDelete(true)}>
          <Text style={styles.removeText}>Remove friend</Text>
        </Pressable>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center', gap: 16 },
  container: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  back: { color: colors.accent, fontSize: 15, marginBottom: 20 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 20 },
  shareBtn: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accent,
    borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16,
  },
  shareBtnText: { color: colors.accent, fontWeight: '600', fontSize: 15 },
  insights: { marginTop: 28 },
  insight: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 12 },
  insightHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  insightTitle: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 },
  aspectChip: { backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  aspectText: { color: colors.accent, fontSize: 12 },
  insightBody: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  removeLink: { alignItems: 'center', marginTop: 28 },
  removeText: { color: colors.error, fontSize: 14 },
  confirm: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginTop: 28 },
  confirmText: { color: colors.text, fontSize: 15 },
  confirmRow: { flexDirection: 'row', gap: 16, marginTop: 14, alignItems: 'center' },
  dangerBtn: { backgroundColor: colors.error, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 },
  dangerText: { color: colors.bg, fontWeight: '600' },
  ghostBtn: { paddingVertical: 12 },
  ghostText: { color: colors.accent, fontWeight: '600' },
  error: { color: colors.error, textAlign: 'center', marginTop: 16 },
});
