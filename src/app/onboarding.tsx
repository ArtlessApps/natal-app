import { useEffect, useState } from 'react';
import { Pressable, View, TextInput, ScrollView, StyleSheet, Switch, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { fetchNatalChart } from '../lib/api';
import { notifyProfileCreated } from '../lib/profile-events';
import { colors, fonts, spacing, type } from '../constants/theme';
import { Body, Button, Caption, Eyebrow, Tagline, Title } from '../components/ui';
import PlaceSearch from '../components/place-search';
import { isValidBirthDate, validateBirthDate } from '../lib/birth-date';
import { searchPlaces, type Place } from '../lib/places';

// IANA zone of the device (e.g. "America/New_York"). A user who skips birth
// details has no birth place to derive tz_str from, and the daily-push cron
// needs one to find their ~08:00.
function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

// First run, and — with ?add=1 — the place a user who skipped comes back to
// add their birth details. Everything here is optional (App Store 5.1.1(v)):
// "Skip for now" creates a bare profile and the app runs on the collective
// sky until they add details.
export default function Onboarding() {
  const router = useRouter();
  const { add } = useLocalSearchParams<{ add?: string }>();
  const adding = add === '1';
  const [name, setName] = useState('');
  const [date, setDate] = useState('');            // YYYY-MM-DD
  const [dateTouched, setDateTouched] = useState(false);
  const [time, setTime] = useState('');            // HH:MM
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<Place[]>([]);
  const [place, setPlace] = useState<Place | null>(null);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [placeSearched, setPlaceSearched] = useState(false);
  const [placeError, setPlaceError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [skipping, setSkipping] = useState(false);

  // Prefill the name: the one already saved (adding details later), else
  // Sign in with Apple's (only present on first auth).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      if (adding) {
        const { data } = await supabase.from('profiles').select('name').eq('id', user.id).maybeSingle();
        if (cancelled) return;
        if (data?.name) {
          setName((prev) => prev || data.name);
          return;
        }
      }
      const meta = user.user_metadata ?? {};
      const fromApple =
        (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
        [meta.given_name, meta.family_name].filter(Boolean).join(' ').trim();
      if (fromApple) setName((prev) => prev || fromApple);
    })();
    return () => {
      cancelled = true;
    };
  }, [adding]);

  async function onSearchPlaces() {
    if (placeQuery.trim().length < 2) return;
    setPlaceSearching(true);
    setPlaceError('');
    setPlaceSearched(true);
    try {
      const results = await searchPlaces(placeQuery);
      setPlaceResults(results);
      // Clear a prior selection if the user is searching again.
      setPlace(null);
    } catch (e: any) {
      setPlaceResults([]);
      setPlaceError(e?.message ?? 'Place search failed. Try again.');
    } finally {
      setPlaceSearching(false);
    }
  }

  const dateError = dateTouched ? validateBirthDate(date) : null;

  // Name is optional; the birth fields are required only to cast a chart —
  // skipping them entirely is the other button.
  const valid =
    isValidBirthDate(date) &&
    (timeUnknown || /^\d{2}:\d{2}$/.test(time)) &&
    place !== null;

  async function submit() {
    setDateTouched(true);
    if (!isValidBirthDate(date) || !place || !valid) return;
    setBusy(true); setError('');
    try {
      // 1) Ask YOUR engine for the chart (+ derived timezone)
      const { chart, tz_str } = await fetchNatalChart({
        name: name.trim() || 'Me',
        date: date.trim(),
        time: timeUnknown ? null : time,
        lat: place.lat,
        lng: place.lng,
      });

      // 2) Save everything on the profile row (RLS lets us write only our own)
      const { data: { user } } = await supabase.auth.getUser();
      const { error: dbError } = await supabase.from('profiles').upsert({
        id: user!.id,
        name: name.trim() || null,
        birth_date: date.trim(),
        birth_time: timeUnknown ? null : time,
        birth_place_label: place.label,
        lat: place.lat,
        lng: place.lng,
        tz_str,
        chart_json: chart,
        notify_hour_local: 8, // PRD 4.7 default: ~08:00 local
      });
      if (dbError) throw dbError;

      // 3) The payoff moment
      router.replace('/reveal');
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Is the API running?');
    } finally {
      setBusy(false);
    }
  }

  // No birth details: a bare profile so routing treats onboarding as done.
  // Today then shows the collective sky (POST /daily/sky); chart features
  // offer to add details when opened.
  async function skip() {
    setSkipping(true); setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: dbError } = await supabase.from('profiles').upsert({
        id: user!.id,
        name: name.trim() || null,
        tz_str: deviceTimeZone(),
        notify_hour_local: 8,
      });
      if (dbError) throw dbError;
      notifyProfileCreated();
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Try again.');
      setSkipping(false);
    }
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {adding ? (
        <Pressable onPress={goBack} style={styles.topLink}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
      ) : (
        <Pressable onPress={skip} disabled={skipping || busy} style={[styles.topLink, styles.topLinkRight]}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      )}

      <Title>{adding ? 'Add your birth details' : 'Set up your journal'}</Title>
      <Tagline style={styles.sub}>
        {adding
          ? 'They let us cast your chart, so each day’s prompt follows the transits to your own placements.'
          : 'Birth details are optional. Add them to tune each day’s prompt to your own chart, or skip and start with today’s sky. You can add them any time.'}
      </Tagline>

      {!adding && (
        <View style={styles.pitch}>
          <Body style={styles.pitchLine}>One reflective prompt a day, tagged to the sky behind it.</Body>
          <Body style={styles.pitchLine}>Echo brings a past entry back when that transit returns.</Body>
          <Body style={styles.pitchLine}>Private by default — never shared or sold.</Body>
        </View>
      )}

      <Eyebrow style={styles.label}>Name (optional)</Eyebrow>
      <TextInput style={styles.input} value={name} onChangeText={setName}
        placeholder="Your name" placeholderTextColor={colors.muted} />

      <Eyebrow style={styles.label}>Birth date</Eyebrow>
      <TextInput
        style={[styles.input, !!dateError && styles.inputError]}
        value={date}
        onChangeText={setDate}
        onBlur={() => setDateTouched(true)}
        placeholder="1990-06-15"
        placeholderTextColor={colors.muted}
        keyboardType="numbers-and-punctuation"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {!!dateError && <Caption style={styles.fieldError}>{dateError}</Caption>}
      {!dateError && !dateTouched && (
        <Caption style={styles.hint}>Format: YYYY-MM-DD</Caption>
      )}

      <View style={styles.row}>
        <Body style={styles.switchLabel}>I don’t know my birth time</Body>
        <Switch value={timeUnknown} onValueChange={setTimeUnknown}
          trackColor={{ true: colors.accent }} />
      </View>
      {!timeUnknown && (
        <TextInput style={styles.input} value={time} onChangeText={setTime}
          placeholder="14:30 (24-hour)" placeholderTextColor={colors.muted} />
      )}
      {timeUnknown && (
        <Caption style={styles.note}>
          No problem — we’ll use a noon chart. Your Rising sign won’t be reliable,
          but everything else holds.
        </Caption>
      )}

      <PlaceSearch
        query={placeQuery}
        onQueryChange={(v) => { setPlaceQuery(v); setPlaceError(''); }}
        onSearch={onSearchPlaces}
        results={placeResults}
        selected={place}
        onSelect={(p) => { setPlace(p); setPlaceResults([p]); }}
        searching={placeSearching}
        searched={placeSearched}
        error={placeError}
      />

      <Button
        label={busy ? 'Casting your chart…' : adding ? 'Save and see my chart' : 'Cast my chart'}
        onPress={submit}
        disabled={!valid || busy || skipping}
        style={styles.submit}
      />
      {!adding && (
        <Button
          label={skipping ? 'Setting things up…' : 'Skip for now — start with today’s sky'}
          onPress={skip}
          disabled={busy || skipping}
          variant="ghost"
          style={styles.skipButton}
        />
      )}
      {!!error && <Caption style={styles.error}>{error}</Caption>}

      {/* Someone reinstalling or switching devices who already linked a real
          account elsewhere — send them to sign in instead of quietly
          creating a second, unlinked anonymous profile. */}
      {!adding && (
        <Pressable onPress={() => router.push('/sign-in')} style={styles.signInLink}>
          <Text style={styles.signInLinkText}>Already have an account? Sign in</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg + 4, paddingTop: 60, paddingBottom: spacing.xxl },
  topLink: { marginBottom: spacing.md },
  topLinkRight: { alignSelf: 'flex-end' },
  backText: { color: colors.accent, fontSize: 15 },
  skipText: { color: colors.accent, fontFamily: fonts.bodyMedium, fontSize: type.body },
  skipButton: { marginTop: spacing.md },
  sub: { marginTop: spacing.xs, marginBottom: spacing.lg },
  pitch: {
    borderLeftWidth: 2,
    borderLeftColor: colors.gold,
    paddingLeft: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  pitchLine: { fontSize: type.small },
  label: { marginBottom: spacing.sm, marginTop: spacing.md },
  switchLabel: { flex: 1 },
  input: {
    backgroundColor: colors.surface, color: colors.text, fontFamily: fonts.body,
    fontSize: type.body, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border, padding: 16,
  },
  inputError: { borderColor: colors.error, borderWidth: 1 },
  hint: { marginTop: spacing.xs },
  fieldError: { color: colors.error, marginTop: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  note: { marginTop: spacing.sm },
  submit: { marginTop: spacing.xl },
  error: { color: colors.error, textAlign: 'center', marginTop: spacing.md },
  signInLink: { marginTop: spacing.lg, alignItems: 'center' },
  signInLinkText: { color: colors.accent, fontFamily: fonts.bodyMedium, fontSize: type.small },
});
