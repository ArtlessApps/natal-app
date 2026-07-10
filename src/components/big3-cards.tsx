// The Big 3 reveal cards (Sun / Moon / Rising), shared by the reveal screen
// and the invite guest page so both render the identity payoff identically.
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { expandSign } from '@/constants/astro';
import type { Big3 } from '@/lib/api';

const ONE_LINERS: Record<string, string> = {
  sun: 'Your engine — what you’re here to become.',
  moon: 'Your weather — how you feel before you think.',
  rising: 'Your doorway — how the world meets you first.',
};

export default function Big3Cards({
  big3,
  timeKnown = true,
}: {
  big3: Big3;
  timeKnown?: boolean;
}) {
  const rows = [
    { key: 'sun', label: 'Sun', sign: big3.sun },
    { key: 'moon', label: 'Moon', sign: big3.moon },
    { key: 'rising', label: 'Rising', sign: big3.rising },
  ];
  return (
    <>
      {rows.map((r) => (
        <View key={r.key} style={styles.card}>
          <Text style={styles.cardLabel}>{r.label}</Text>
          <Text style={styles.cardSign}>{expandSign(r.sign)}</Text>
          <Text style={styles.cardLine}>{ONE_LINERS[r.key]}</Text>
          {r.key === 'rising' && !timeKnown && (
            <Text style={styles.caveat}>Approximate — birth time unknown</Text>
          )}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 14 },
  cardLabel: { color: colors.muted, fontSize: 13 },
  cardSign: { color: colors.text, fontSize: 26, fontWeight: '700', marginVertical: 4 },
  cardLine: { color: colors.muted, fontSize: 14 },
  caveat: { color: colors.accent, fontSize: 12, marginTop: 8 },
});
