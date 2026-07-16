// Data + actions for the friend comparison screen: loads the friend row and
// synastry-lite compat result, and exposes share/remove/back handlers.
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { fetchCompat, type CompatResult } from '@/lib/api';
import { deleteFriend, getFriend, getOwnerCompareData } from '@/lib/friends';
import { useShareCard } from '@/lib/use-share-card';
import type { Friend } from '@/types/friend';

export function useFriendComparison(id: string) {
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
          setError('Connection not found.'); return;
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
      `${ownerName} & ${friend.guest_name ?? 'Connection'} — our charts, compared on Natal`,
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

  return {
    friend, ownerName, compat, loading, error,
    confirmingDelete, setConfirmingDelete, busy,
    cardRef, sharing, share, remove, goBack,
  };
}
