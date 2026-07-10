// Public guest page (PRD §4.5, Step 8.6). No auth — the token in the URL is
// the credential; root-layout guards exempt this route (Step 8.6D). It runs on
// web too, so nothing native-only here. Four phases: landing → form → reveal
// → locked. Gift before gate: the guest always gets their own Big 3; only the
// comparison is locked behind the app.
import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { colors } from '@/constants/theme';
import {
  fetchInviteInfo, submitInvite, type Big3, type InviteInfo,
} from '@/lib/api';
import { APP_STORE_URL, TESTFLIGHT_MODE } from '@/constants/links';
import BirthDataForm, { type BirthDataValues } from '@/components/birth-data-form';
import Big3Cards from '@/components/big3-cards';

type Phase = 'landing' | 'form' | 'reveal' | 'locked';

export default function InvitePage() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [phase, setPhase] = useState<Phase>('landing');
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notActive, setNotActive] = useState(false); // 404 or missing token
  const [loadError, setLoadError] = useState('');

  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [big3, setBig3] = useState<Big3 | null>(null);
  const [inviterName, setInviterName] = useState('');
  const [timeKnown, setTimeKnown] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) { setNotActive(true); setLoading(false); return; }
      try {
        const data = await fetchInviteInfo(token);
        if (!active) return;
        if (!data) { setNotActive(true); return; }
        setInfo(data);
        setInviterName(data.inviter_name);
      } catch (e: any) {
        if (active) setLoadError(e.message ?? 'Couldn’t load this invite.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token]);

  async function handleSubmit(v: BirthDataValues) {
    if (!token) return;
    setBusy(true); setSubmitError('');
    try {
      const result = await submitInvite(token, {
        name: v.name, date: v.date, time: v.time, lat: v.lat, lng: v.lng,
      });
      setBig3(result.big3);
      setInviterName(result.inviter_name);
      setTimeKnown(v.time !== null);
      setPhase('reveal');
    } catch (e: any) {
      setSubmitError(e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.wrap, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.wrap, styles.center]}>
        <Text style={styles.msg}>{loadError}</Text>
      </View>
    );
  }

  if (notActive) {
    return (
      <View style={[styles.wrap, styles.center]}>
        <Text style={styles.glyph}>✦</Text>
        <Text style={styles.msg}>This invite link isn’t active.</Text>
      </View>
    );
  }

  if (info?.status === 'complete') {
    return (
      <View style={[styles.wrap, styles.center]}>
        <Text style={styles.glyph}>✦</Text>
        <Text style={styles.msg}>This invite was already used.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.container}>
      {phase === 'landing' && (
        <View style={styles.landing}>
          <Text style={styles.glyph}>✦</Text>
          <Text style={styles.title}>{inviterName} wants to compare charts with you</Text>
          <Text style={styles.sub}>
            Enter your birth details to see your own Sun, Moon, and Rising — then how your skies fit together.
          </Text>
          <Pressable style={styles.button} onPress={() => setPhase('form')}>
            <Text style={styles.buttonText}>Cast my chart</Text>
          </Pressable>
        </View>
      )}

      {phase === 'form' && (
        <>
          <Text style={styles.eyebrow}>YOUR BIRTH DETAILS</Text>
          <Text style={styles.sub}>They stay yours. {inviterName} only sees how you two compare.</Text>
          <BirthDataForm submitLabel="Cast my chart" busy={busy} error={submitError} onSubmit={handleSubmit} namePlaceholder="Your name" />
        </>
      )}

      {phase === 'reveal' && big3 && (
        <>
          <Text style={styles.eyebrow}>YOUR BIG 3</Text>
          <Big3Cards big3={big3} timeKnown={timeKnown} />
          <Pressable style={styles.button} onPress={() => setPhase('locked')}>
            <Text style={styles.buttonText}>See your compatibility with {inviterName}</Text>
          </Pressable>
        </>
      )}

      {phase === 'locked' && (
        <View style={styles.landing}>
          <Text style={styles.glyph}>✦</Text>
          <Text style={styles.title}>Your compatibility with {inviterName} is ready.</Text>
          {TESTFLIGHT_MODE || !APP_STORE_URL ? (
            <Text style={styles.sub}>
              Natal is in early access — {inviterName} can show you in the app.
            </Text>
          ) : (
            <Pressable style={styles.button} onPress={() => Linking.openURL(APP_STORE_URL)}>
              <Text style={styles.buttonText}>Get Natal</Text>
            </Pressable>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center', padding: 28, gap: 12 },
  container: { padding: 28, paddingTop: 90, paddingBottom: 60 },
  landing: { alignItems: 'center', gap: 16 },
  glyph: { color: colors.accent, fontSize: 40 },
  title: { color: colors.text, fontSize: 26, fontWeight: '700', textAlign: 'center', lineHeight: 34 },
  eyebrow: { color: colors.muted, letterSpacing: 3, fontSize: 12, marginBottom: 12, textAlign: 'center' },
  sub: { color: colors.muted, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  msg: { color: colors.text, fontSize: 16, textAlign: 'center', lineHeight: 24 },
  button: {
    backgroundColor: colors.accent, borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 24, alignSelf: 'stretch',
  },
  buttonText: { color: colors.bg, fontWeight: '700', fontSize: 16 },
});
