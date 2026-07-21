import { useEffect, useState } from 'react';
import { View, TextInput, ScrollView, StyleSheet, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { fetchNatalChart } from '../lib/api';
import { colors, fonts, spacing, type } from '../constants/theme';
import { Body, Button, Caption, Eyebrow, Tagline, Title } from '../components/ui';
import PlaceSearch from '../components/place-search';
import { isValidBirthDate, validateBirthDate } from '../lib/birth-date';
import { searchPlaces, type Place } from '../lib/places';

export default function Onboarding() {
  const router = useRouter();
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

  // Prefill display name from Sign in with Apple (only present on first auth).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      const meta = user.user_metadata ?? {};
      const fromApple =
        (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
        [meta.given_name, meta.family_name].filter(Boolean).join(' ').trim();
      if (fromApple) setName((prev) => prev || fromApple);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const valid =
    name.trim().length > 0 &&
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
        name: name.trim(),
        date: date.trim(),
        time: timeUnknown ? null : time,
        lat: place.lat,
        lng: place.lng,
      });

      // 2) Save everything on the profile row (RLS lets us write only our own)
      const { data: { user } } = await supabase.auth.getUser();
      const { error: dbError } = await supabase.from('profiles').upsert({
        id: user!.id,
        name: name.trim(),
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

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Title>Cast your chart</Title>
      <Tagline style={styles.sub}>Where the planets were the moment you arrived.</Tagline>

      <Eyebrow style={styles.label}>Name</Eyebrow>
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
        label={busy ? 'Reading the sky…' : 'Cast my chart'}
        onPress={submit}
        disabled={!valid || busy}
        style={styles.submit}
      />
      {!!error && <Caption style={styles.error}>{error}</Caption>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg + 4, paddingTop: 80, paddingBottom: spacing.xxl },
  sub: { marginTop: spacing.xs, marginBottom: spacing.xl },
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
});
