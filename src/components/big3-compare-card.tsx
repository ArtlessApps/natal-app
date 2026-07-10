// Side-by-side Big 3 comparison card (PRD §4.5). Doubles as the visual for
// the shareable card. Kept presentational so it can be captured/screenshotted.
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { expandSign } from '@/constants/astro';
import type { Big3 } from '@/lib/api';

const ROWS: { key: keyof Big3; glyph: string; label: string }[] = [
  { key: 'sun', glyph: '☉', label: 'Sun' },
  { key: 'moon', glyph: '☽', label: 'Moon' },
  { key: 'rising', glyph: '↑', label: 'Rising' },
];

export default function Big3CompareCard({
  nameA, big3A, nameB, big3B,
}: {
  nameA: string;
  big3A: Big3 | null;
  nameB: string;
  big3B: Big3 | null;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.name} numberOfLines={1}>{nameA}</Text>
        <Text style={styles.amp}>&</Text>
        <Text style={styles.name} numberOfLines={1}>{nameB}</Text>
      </View>
      {ROWS.map((r) => (
        <View key={r.key} style={styles.row}>
          <Text style={styles.side} numberOfLines={1}>
            {big3A ? expandSign(big3A[r.key]) : '—'}
          </Text>
          <View style={styles.center}>
            <Text style={styles.glyph}>{r.glyph}</Text>
            <Text style={styles.label}>{r.label}</Text>
          </View>
          <Text style={styles.side} numberOfLines={1}>
            {big3B ? expandSign(big3B[r.key]) : '—'}
          </Text>
        </View>
      ))}
      <Text style={styles.brand}>Natal</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 22 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  name: { color: colors.text, fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  amp: { color: colors.accent, fontSize: 16, marginHorizontal: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.bg },
  side: { color: colors.text, fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center' },
  center: { alignItems: 'center', width: 70 },
  glyph: { color: colors.accent, fontSize: 20 },
  label: { color: colors.muted, fontSize: 11, marginTop: 2 },
  brand: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 16, letterSpacing: 2 },
});
