// Reusable birth-data entry form (name + date + time + place search).
// Used by the Add-a-friend flow (PRD §4.5); mirrors the onboarding fields so
// the two stay consistent. Place search uses Nominatim (free, no key).
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { colors } from '@/constants/theme';

type Place = { label: string; lat: number; lng: number };

export type BirthDataValues = {
  name: string;
  date: string;          // YYYY-MM-DD
  time: string | null;   // HH:MM or null (unknown)
  lat: number;
  lng: number;
  placeLabel: string;
};

export default function BirthDataForm({
  submitLabel,
  busy,
  error,
  onSubmit,
}: {
  submitLabel: string;
  busy: boolean;
  error?: string;
  onSubmit: (values: BirthDataValues) => void;
}) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<Place[]>([]);
  const [place, setPlace] = useState<Place | null>(null);

  async function searchPlaces() {
    if (placeQuery.trim().length < 3) return;
    const url =
      `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=` +
      encodeURIComponent(placeQuery);
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const rows = await res.json();
    setPlaceResults(
      rows.map((r: any) => ({ label: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) })),
    );
  }

  const valid =
    name.trim().length > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    (timeUnknown || /^\d{2}:\d{2}$/.test(time)) &&
    place !== null;

  function submit() {
    if (!valid || !place) return;
    onSubmit({
      name: name.trim(),
      date,
      time: timeUnknown ? null : time,
      lat: place.lat,
      lng: place.lng,
      placeLabel: place.label,
    });
  }

  return (
    <View>
      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName}
        placeholder="Their name" placeholderTextColor={colors.muted} />

      <Text style={styles.label}>Birth date</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate}
        placeholder="1990-06-15" placeholderTextColor={colors.muted} />

      <View style={styles.row}>
        <Text style={styles.label}>Birth time unknown</Text>
        <Switch value={timeUnknown} onValueChange={setTimeUnknown}
          trackColor={{ true: colors.accent }} />
      </View>
      {!timeUnknown && (
        <TextInput style={styles.input} value={time} onChangeText={setTime}
          placeholder="14:30 (24-hour)" placeholderTextColor={colors.muted} />
      )}
      {timeUnknown && (
        <Text style={styles.note}>
          We’ll use a noon chart. Their Rising sign won’t be reliable, but everything else holds.
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
      {placeResults.map((p, i) => (
        <Pressable key={`${i}-${p.lat},${p.lng}`}
          style={[styles.result, place?.label === p.label && styles.resultActive]}
          onPress={() => { setPlace(p); setPlaceResults([p]); }}>
          <Text style={styles.resultText} numberOfLines={2}>{p.label}</Text>
        </Pressable>
      ))}

      <Pressable style={[styles.button, (!valid || busy) && styles.buttonDisabled]}
        onPress={submit} disabled={!valid || busy}>
        <Text style={styles.buttonText}>{busy ? 'Reading the sky…' : submitLabel}</Text>
      </Pressable>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
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
