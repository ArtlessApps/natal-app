// Add a friend (PRD §4.5): enter their birth details → compute a guest chart
// → store it under the owner. Opens straight into the comparison afterward.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing } from '@/constants/theme';
import { Tagline, Title } from '@/components/ui';
import { fetchNatalChart } from '@/lib/api';
import { addFriend, FREE_FRIEND_LIMIT, listFriends } from '@/lib/friends';
import BirthDataForm, { type BirthDataValues } from '@/components/birth-data-form';
import type { Chart } from '@/lib/learn';

export default function AddFriend() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/friends');
  }

  async function handleSubmit(v: BirthDataValues) {
    setBusy(true); setError('');
    try {
      // Re-check the cap server-side-of-truth (guards a direct deep link).
      const existing = await listFriends();
      if (existing.length >= FREE_FRIEND_LIMIT) {
        throw new Error(`Free limit is ${FREE_FRIEND_LIMIT} friends.`);
      }
      const { chart } = await fetchNatalChart({
        name: v.name, date: v.date, time: v.time, lat: v.lat, lng: v.lng,
      });
      const friend = await addFriend({
        name: v.name,
        chart: chart as Chart,
        birthDate: v.date,
        birthTime: v.time,
        placeLabel: v.placeLabel,
      });
      router.replace(`/friends/${friend.id}`);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Is the API running?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Pressable onPress={goBack}><Text style={styles.back}>← Friends</Text></Pressable>
      <Title>Add a friend</Title>
      <Tagline style={styles.sub}>Their birth details stay private to you.</Tagline>
      <BirthDataForm submitLabel="Compare charts" busy={busy} error={error} onSubmit={handleSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg + 4, paddingTop: 60, paddingBottom: spacing.xxl },
  back: { color: colors.accent, fontSize: 15, marginBottom: spacing.lg },
  sub: { marginTop: spacing.xs, marginBottom: spacing.md },
});
