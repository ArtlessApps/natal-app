// The payoff screen. Reads the freshly saved chart and presents
// Sun / Moon / Rising. Also the perfect moment to ask for
// notification permission (PRD 4.1) — maximum delight = best opt-in rate.
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { registerForPushNotifications } from '@/lib/notifications';
import { colors } from '@/constants/theme';

// Kerykeion abbreviates signs ("Gem"); we present them properly.
const SIGN_NAMES: Record<string, string> = {
  Ari: 'Aries', Tau: 'Taurus', Gem: 'Gemini', Can: 'Cancer',
  Leo: 'Leo', Vir: 'Virgo', Lib: 'Libra', Sco: 'Scorpio',
  Sag: 'Sagittarius', Cap: 'Capricorn', Aqu: 'Aquarius', Pis: 'Pisces',
};
const pretty = (abbr: string) => SIGN_NAMES[abbr] ?? abbr;

const ONE_LINERS: Record<string, string> = {
  sun: 'Your engine — what you’re here to become.',
  moon: 'Your weather — how you feel before you think.',
  rising: 'Your doorway — how the world meets you first.',
};

export default function Reveal() {
  const router = useRouter();
  const [big3, setBig3] = useState<{ sun: string; moon: string; rising: string } | null>(null);
  const [timeKnown, setTimeKnown] = useState(true);
  // True once we've asked (or skipped) — CTA stays disabled until then so
  // the permission prompt isn't racing the navigation away from this screen.
  const [pushReady, setPushReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      const { data } = await supabase
        .from('profiles')
        .select('chart_json, birth_time')
        .eq('id', user!.id)
        .single();
      setBig3(data?.chart_json?.big3 ?? null);
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

  const rows = [
    { key: 'sun', label: 'Sun', sign: big3.sun },
    { key: 'moon', label: 'Moon', sign: big3.moon },
    { key: 'rising', label: 'Rising', sign: big3.rising },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>YOUR BIG 3</Text>
      {rows.map((r) => (
        <View key={r.key} style={styles.card}>
          <Text style={styles.cardLabel}>{r.label}</Text>
          <Text style={styles.cardSign}>{pretty(r.sign)}</Text>
          <Text style={styles.cardLine}>{ONE_LINERS[r.key]}</Text>
          {r.key === 'rising' && !timeKnown && (
            <Text style={styles.caveat}>Approximate — birth time unknown</Text>
          )}
        </View>
      ))}

      <Pressable
        style={[styles.button, !pushReady && styles.buttonDisabled]}
        onPress={() => router.replace('/(tabs)')}
        disabled={!pushReady}
      >
        <Text style={styles.buttonText}>See today’s sky</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 28, paddingTop: 90 },
  eyebrow: { color: colors.muted, letterSpacing: 3, fontSize: 12, marginBottom: 20, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 14 },
  cardLabel: { color: colors.muted, fontSize: 13 },
  cardSign: { color: colors.text, fontSize: 26, fontWeight: '700', marginVertical: 4 },
  cardLine: { color: colors.muted, fontSize: 14 },
  caveat: { color: colors.accent, fontSize: 12, marginTop: 8 },
  button: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 'auto', marginBottom: 40 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.bg, fontWeight: '600', fontSize: 16 },
});
