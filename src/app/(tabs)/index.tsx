// Reflect tab (PRD 4.2): today's journal prompt, Echo (past entry matching
// today's transit), then the reading and its "Why?" disclosure. Writing leads;
// the reading is the context that produced the prompt. Loads the signed-in
// user's saved birth data, asks the API to compute today's reading for it,
// then renders the result. Birth details are optional (App Store 5.1.1(v)):
// without them it shows the collective sky (/daily/sky) plus an offer to
// personalize.
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { fetchDaily, fetchSky, type DailyReading } from '@/lib/api';
import { colors, spacing } from '@/constants/theme';
import { Body, Button, Eyebrow, Horizon, Title } from '@/components/ui';
import WhyDisclosure from '@/components/why-disclosure';
import JournalPrompt from '@/components/journal-prompt';
import EchoCard from '@/components/echo-card';
import ShareCard from '@/components/share-card';
import AddBirthDetails from '@/components/add-birth-details';
import { useShareCard } from '@/lib/use-share-card';

type Profile = {
  name: string | null;
  birth_date: string | null;
  birth_time: string | null;
  lat: number | null;
  lng: number | null;
};

// Which reading is on screen — so refocusing only refetches when the user
// has since added birth details (or the day rolled over), not on every tab
// switch.
type Loaded = { date: string; personal: boolean };

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
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState('');
  const { cardRef, share, sharing } = useShareCard();
  const date = todayLocal();
  const personal = loaded?.personal ?? false;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('name, birth_date, birth_time, lat, lng')
          .eq('id', user.id)
          .single<Profile>();
        if (cancelled) return;
        if (profileError || !profile) {
          setError('Could not load your profile. Try again in a moment.');
          return;
        }
        const hasChart = !!profile.birth_date && profile.lat != null && profile.lng != null;
        if (loaded && loaded.date === date && loaded.personal === hasChart) return;
        setError('');
        setUserId(user.id);
        try {
          const daily = hasChart
            ? await fetchDaily(
                {
                  name: profile.name || 'Me',
                  date: profile.birth_date!,
                  time: profile.birth_time,
                  lat: profile.lat!,
                  lng: profile.lng!,
                },
                date,
                user.id
              )
            : await fetchSky(date, user.id);
          if (cancelled) return;
          setReading(daily);
          setLoaded({ date, personal: hasChart });
        } catch (e: any) {
          if (!cancelled) setError(e.message ?? 'Something went wrong. Is the API running?');
        }
      }
      load();
      return () => {
        cancelled = true;
      };
    }, [date, loaded])
  );

  const headerDate = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.container}>
      <Eyebrow>{headerDate}</Eyebrow>

      {!reading && !error && <ActivityIndicator color={colors.accent} style={styles.spinner} />}
      {!!error && <Body style={styles.error}>{error}</Body>}

      {reading && userId && (
        <>
          <JournalPrompt
            style={styles.prompt}
            userId={userId}
            entryDate={date}
            prompt={reading.prompt}
            intensity={reading.type}
            driver={reading.driver}
            contentId={reading.content_id}
            headline={reading.headline}
            body={reading.body}
          />

          <EchoCard
            userId={userId}
            entryDate={date}
            driver={reading.driver}
          />

          <Horizon style={styles.divider} />

          <Eyebrow>Today’s sky</Eyebrow>
          <Title style={styles.headline}>{reading.headline ?? 'Today'}</Title>
          <Body style={styles.body}>{reading.body}</Body>

          <WhyDisclosure type={reading.type} driver={reading.driver} personal={personal} />

          {!personal && (
            <AddBirthDetails
              title="Make it yours"
              body="This is today’s sky for everyone. Add your birth details and each day’s prompt follows the transits to your own chart."
              style={styles.personalize}
            />
          )}

          <Button
            label={sharing ? 'Preparing…' : 'Share today'}
            onPress={share}
            disabled={sharing}
            variant="terracotta"
            style={styles.shareButton}
          />

          {/* Off-screen render target — fully laid out but parked far off-screen. */}
          <View style={{ position: 'absolute', left: -9999 }}>
            <ShareCard
              ref={cardRef}
              data={{
                variant: 'today',
                headline: reading.headline ?? 'Today',
                body: reading.body,
                intensity: reading.type,
                dateLabel: headerDate,
              }}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingTop: 70, paddingBottom: spacing.xxl },
  // Breathing room so the prompt's kicker doesn't crowd the date above it.
  prompt: { marginTop: spacing.lg },
  divider: { marginTop: spacing.xl },
  headline: { marginTop: spacing.sm },
  body: { marginTop: spacing.md },
  spinner: { marginTop: spacing.xxl },
  error: { color: colors.error, marginTop: spacing.xl, textAlign: 'center' },
  shareButton: { marginTop: spacing.lg },
  personalize: { marginTop: spacing.xl },
});
