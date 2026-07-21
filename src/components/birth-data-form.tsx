// Reusable birth-data entry form (name + date + time + place search).
// Used by the Add-a-friend flow (PRD §4.5); mirrors the onboarding fields so
// the two stay consistent. Place search via shared lib/places (Photon).
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { colors } from '@/constants/theme';
import { isValidBirthDate, validateBirthDate } from '@/lib/birth-date';
import { searchPlaces, type Place } from '@/lib/places';

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
  namePlaceholder = 'Their name',
}: {
  submitLabel: string;
  busy: boolean;
  error?: string;
  onSubmit: (values: BirthDataValues) => void;
  // "Their name" for the owner adding a friend; "Your name" on the guest
  // invite page, where the person is entering their own details.
  namePlaceholder?: string;
}) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [dateTouched, setDateTouched] = useState(false);
  const [time, setTime] = useState('');
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<Place[]>([]);
  const [place, setPlace] = useState<Place | null>(null);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [placeSearched, setPlaceSearched] = useState(false);
  const [placeError, setPlaceError] = useState('');

  async function onSearchPlaces() {
    if (placeQuery.trim().length < 2) return;
    setPlaceSearching(true);
    setPlaceError('');
    setPlaceSearched(true);
    try {
      const results = await searchPlaces(placeQuery);
      setPlaceResults(results);
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

  function submit() {
    setDateTouched(true);
    if (!isValidBirthDate(date) || !place || !valid) return;
    onSubmit({
      name: name.trim(),
      date: date.trim(),
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
        placeholder={namePlaceholder} placeholderTextColor={colors.muted} />

      <Text style={styles.label}>Birth date</Text>
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
      {!!dateError && <Text style={styles.fieldError}>{dateError}</Text>}
      {!dateError && !dateTouched && (
        <Text style={styles.hint}>Format: YYYY-MM-DD</Text>
      )}

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
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          value={placeQuery}
          onChangeText={(v) => { setPlaceQuery(v); setPlaceError(''); }}
          placeholder="City, country"
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
          onSubmitEditing={onSearchPlaces}
        />
        <Pressable
          style={[styles.searchBtn, placeSearching && styles.buttonDisabled]}
          onPress={onSearchPlaces}
          disabled={placeSearching}
        >
          <Text style={styles.buttonText}>{placeSearching ? '…' : 'Search'}</Text>
        </Pressable>
      </View>
      {!!placeError && <Text style={styles.placeFeedback}>{placeError}</Text>}
      {!placeError && placeSearched && placeResults.length === 0 && !placeSearching && (
        <Text style={styles.placeFeedback}>
          No places found — try a city and country (e.g. “Lisbon, Portugal”).
        </Text>
      )}
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
  inputError: { borderColor: colors.error, borderWidth: 1 },
  hint: { color: colors.muted, fontSize: 13, marginTop: 4 },
  fieldError: { color: colors.error, fontSize: 13, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  note: { color: colors.muted, fontSize: 13, marginTop: 8 },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchBtn: { backgroundColor: colors.surface, borderRadius: 12, padding: 16 },
  result: { backgroundColor: colors.surface, borderRadius: 10, padding: 12, marginTop: 8 },
  resultActive: { borderWidth: 1, borderColor: colors.accent },
  resultText: { color: colors.text, fontSize: 13 },
  placeFeedback: { color: colors.muted, fontSize: 13, marginTop: 8 },
  button: {
    backgroundColor: colors.accent, borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 32,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.bg, fontWeight: '600' },
  error: { color: colors.error, textAlign: 'center', marginTop: 16 },
});
