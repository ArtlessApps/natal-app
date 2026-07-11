import { useState } from 'react';
import { View, TextInput, ScrollView, StyleSheet, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { fetchNatalChart } from '../lib/api';
import { colors, fonts, spacing, type } from '../constants/theme';
import { Body, Button, Caption, Eyebrow, Tagline, Title } from '../components/ui';
import PlaceSearch, { type Place } from '../components/place-search';

export default function Onboarding() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');            // YYYY-MM-DD
  const [time, setTime] = useState('');            // HH:MM
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<Place[]>([]);
  const [place, setPlace] = useState<Place | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Search cities via Nominatim (OpenStreetMap). Free, no key.
  async function searchPlaces() {
    if (placeQuery.trim().length < 3) return;
    const url =
      `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=` +
      encodeURIComponent(placeQuery);
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const rows = await res.json();
    setPlaceResults(
      rows.map((r: any) => ({
        label: r.display_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      }))
    );
  }

  const valid =
    name.trim().length > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    (timeUnknown || /^\d{2}:\d{2}$/.test(time)) &&
    place !== null;

  async function submit() {
    if (!valid || !place) return;
    setBusy(true); setError('');
    try {
      // 1) Ask YOUR engine for the chart (+ derived timezone)
      const { chart, tz_str } = await fetchNatalChart({
        name: name.trim(),
        date,
        time: timeUnknown ? null : time,
        lat: place.lat,
        lng: place.lng,
      });

      // 2) Save everything on the profile row (RLS lets us write only our own)
      const { data: { user } } = await supabase.auth.getUser();
      const { error: dbError } = await supabase.from('profiles').upsert({
        id: user!.id,
        name: name.trim(),
        birth_date: date,
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
      <TextInput style={styles.input} value={date} onChangeText={setDate}
        placeholder="1990-06-15" placeholderTextColor={colors.muted} />

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
        onQueryChange={setPlaceQuery}
        onSearch={searchPlaces}
        results={placeResults}
        selected={place}
        onSelect={(p) => { setPlace(p); setPlaceResults([p]); }}
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  note: { marginTop: spacing.sm },
  submit: { marginTop: spacing.xl },
  error: { color: colors.error, textAlign: 'center', marginTop: spacing.md },
});
