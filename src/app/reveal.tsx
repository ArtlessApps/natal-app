// The payoff screen. Reads the freshly saved chart and presents
// Sun / Moon / Rising. Also the perfect moment to ask for
// notification permission (PRD 4.1) — maximum delight = best opt-in rate.
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { registerForPushNotifications } from '@/lib/notifications';
import { colors } from '@/constants/theme';
import { expandSign } from '@/constants/astro';
import Big3Cards from '@/components/big3-cards';
import ShareCard from '@/components/share-card';
import { useShareCard } from '@/lib/use-share-card';

export default function Reveal() {
  const router = useRouter();
  const [big3, setBig3] = useState<{ sun: string; moon: string; rising: string } | null>(null);
  const [name, setName] = useState('');
  const [timeKnown, setTimeKnown] = useState(true);
  // True once we've asked (or skipped) — CTA stays disabled until then so
  // the permission prompt isn't racing the navigation away from this screen.
  const [pushReady, setPushReady] = useState(false);
  const { cardRef, share, sharing } = useShareCard();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      const { data } = await supabase
        .from('profiles')
        .select('name, chart_json, birth_time')
        .eq('id', user!.id)
        .single();
      setBig3(data?.chart_json?.big3 ?? null);
      setName(data?.name ?? '');
      setTimeKnown(!!data?.birth_time);
    });
  }, []);

  // Ask for push permission once the Big 3 is on screen — not before, so
  // the OS dialog appears against the payoff moment, not a blank spinner.
  useEffect(() => {
    if (!big3) return;
    registerForPushNotifications()
      .catch((e) => console.warn('[push] register failed', e))
      .finally(() => setPushReady(true));
  }, [big3]);

  if (!big3) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>YOUR BIG 3</Text>
      <Big3Cards big3={big3} timeKnown={timeKnown} />

      <Pressable style={styles.shareButton} onPress={share} disabled={sharing}>
        <Text style={styles.shareButtonText}>
          {sharing ? 'Preparing…' : 'Share my Big 3'}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.button, !pushReady && styles.buttonDisabled]}
        onPress={() => router.replace('/(tabs)')}
        disabled={!pushReady}
      >
        <Text style={styles.buttonText}>See today’s sky</Text>
      </Pressable>

      {/* Off-screen render target — fully laid out but parked far off-screen. */}
      <View style={{ position: 'absolute', left: -9999 }}>
        <ShareCard
          ref={cardRef}
          data={{
            variant: 'big3',
            name,
            sun: expandSign(big3.sun),
            moon: expandSign(big3.moon),
            rising: expandSign(big3.rising),
            risingApprox: !timeKnown,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 28, paddingTop: 90 },
  eyebrow: { color: colors.muted, letterSpacing: 3, fontSize: 12, marginBottom: 20, textAlign: 'center' },
  button: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 'auto', marginBottom: 40 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.bg, fontWeight: '600', fontSize: 16 },
  shareButton: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accent,
    borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16,
  },
  shareButtonText: { color: colors.accent, fontWeight: '600', fontSize: 15 },
});
