import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { fetchNatalChart } from '../lib/api';
import { colors } from '../constants/theme';

type Place = { label: string; lat: number; lng: number };

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
      <Text style={styles.title}>Cast your chart</Text>
      <Text style={styles.sub}>Where the planets were the moment you arrived.</Text>

      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName}
        placeholder="Your name" placeholderTextColor={colors.muted} />

      <Text style={styles.label}>Birth date</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate}
        placeholder="1990-06-15" placeholderTextColor={colors.muted} />

      <View style={styles.row}>
        <Text style={styles.label}>I don’t know my birth time</Text>
        <Switch value={timeUnknown} onValueChange={setTimeUnknown}
          trackColor={{ true: colors.accent }} />
      </View>
      {!timeUnknown && (
        <TextInput style={styles.input} value={time} onChangeText={setTime}
          placeholder="14:30 (24-hour)" placeholderTextColor={colors.muted} />
      )}
      {timeUnknown && (
        <Text style={styles.note}>
          No problem — we’ll use a noon chart. Your Rising sign won’t be reliable,
          but everything else holds.
        </Text>
      )}

      <Text style={styles.label}>Birth place</Text>
      <View style={styles.searchRow}>
        <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]}
          value={placeQuery} onChangeText={setPlaceQuery}
          placeholder="City name" placeholderTextColor={colors.muted} />
        <Pressable style={styles.searchBtn} onPress={searchPlaces}>
          <Text style={styles.buttonText}>Search</Text>
        </Pressable>
      </View>
      {placeResults.map((p) => (
        <Pressable key={p.label}
          style={[styles.result, place?.label === p.label && styles.resultActive]}
          onPress={() => { setPlace(p); setPlaceResults([p]); }}>
          <Text style={styles.resultText} numberOfLines={2}>{p.label}</Text>
        </Pressable>
      ))}

      <Pressable style={[styles.button, !valid && styles.buttonDisabled]}
        onPress={submit} disabled={!valid || busy}>
        <Text style={styles.buttonText}>{busy ? 'Reading the sky…' : 'Cast my chart'}</Text>
      </Pressable>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 28, paddingTop: 80, paddingBottom: 60 },
  title: { color: colors.text, fontSize: 30, fontWeight: '700' },
  sub: { color: colors.muted, marginTop: 6, marginBottom: 28 },
  label: { color: colors.text, marginBottom: 8, marginTop: 16, fontWeight: '500' },
  input: {
    backgroundColor: colors.surface, color: colors.text, borderRadius: 12,
    padding: 16, fontSize: 16, marginBottom: 4,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  note: { color: colors.muted, fontSize: 13, marginTop: 8 },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchBtn: { backgroundColor: colors.surface, borderRadius: 12, padding: 16 },
  result: { backgroundColor: colors.surface, borderRadius: 10, padding: 12, marginTop: 8 },
  resultActive: { borderWidth: 1, borderColor: colors.accent },
  resultText: { color: colors.text, fontSize: 13 },
  button: {
    backgroundColor: colors.accent, borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 32,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.bg, fontWeight: '600' },
  error: { color: colors.error, textAlign: 'center', marginTop: 16 },
});