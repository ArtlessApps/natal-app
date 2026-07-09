// Today tab (PRD 4.2): the daily reading, the "Why?" disclosure, and the
// journal prompt. Loads the signed-in user's saved birth data, asks the
// API to compute today's reading for it, then renders the result.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { fetchDaily, type DailyReading } from '@/lib/api';
import { colors } from '@/constants/theme';
import WhyDisclosure from '@/components/why-disclosure';
import JournalPrompt from '@/components/journal-prompt';

type Profile = {
  name: string;
  birth_date: string;
  birth_time: string | null;
  lat: number;
  lng: number;
};

// Local calendar date (not UTC) so "today" matches the device's day —
// same string is reused as the journal entry's entry_date.
function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function TodayScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [reading, setReading] = useState<DailyReading | null>(null);
  const [error, setError] = useState('');
  const date = todayLocal();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError('');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name, birth_date, birth_time, lat, lng')
        .eq('id', user.id)
        .single<Profile>();
      if (cancelled) return;
      if (profileError || !profile) {
        setError('Could not load your chart. Try finishing onboarding again.');
        return;
      }
      setUserId(user.id);
      try {
        const daily = await fetchDaily(
          {
            name: profile.name,
            date: profile.birth_date,
            time: profile.birth_time,
            lat: profile.lat,
            lng: profile.lng,
          },
          date
        );
        if (!cancelled) setReading(daily);
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'Something went wrong. Is the API running?');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [date]);

  const headerDate = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.container}>
      <Text style={styles.date}>{headerDate.toUpperCase()}</Text>

      {!reading && !error && <ActivityIndicator color={colors.accent} style={styles.spinner} />}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {reading && userId && (
        <>
          <Text style={styles.headline}>{reading.headline ?? 'Today'}</Text>
          <Text style={styles.body}>{reading.body}</Text>

          <WhyDisclosure type={reading.type} driver={reading.driver} />

          <JournalPrompt
            userId={userId}
            entryDate={date}
            prompt={reading.prompt}
            type={reading.type}
            driver={reading.driver}
            contentId={reading.content_id}
            headline={reading.headline}
            body={reading.body}
          />
        </>
      )}

      {__DEV__ && (
        <Pressable style={styles.signOut} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.signOutText}>[dev] Sign out</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 24, paddingTop: 70, paddingBottom: 60 },
  date: { color: colors.muted, fontSize: 12, letterSpacing: 2, marginBottom: 12 },
  headline: { color: colors.text, fontSize: 26, fontWeight: '700', lineHeight: 32 },
  body: { color: colors.text, fontSize: 16, lineHeight: 24, marginTop: 16, opacity: 0.9 },
  spinner: { marginTop: 60 },
  error: { color: colors.error, marginTop: 40, textAlign: 'center' },
  signOut: { alignSelf: 'center', marginTop: 40 },
  signOutText: { color: colors.accent },
});
