// Birth-place search + result picker used on the onboarding screen.
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, radius, spacing, type } from '@/constants/theme';
import { Button, Caption, Eyebrow } from '@/components/ui';
import type { Place } from '@/lib/places';

export type { Place };

export default function PlaceSearch({
  query, onQueryChange, onSearch, results, selected, onSelect,
  searching = false, error, searched = false,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  onSearch: () => void;
  results: Place[];
  selected: Place | null;
  onSelect: (p: Place) => void;
  searching?: boolean;
  error?: string;
  /** True after at least one search attempt (so we can show "no results"). */
  searched?: boolean;
}) {
  return (
    <View>
      <Eyebrow style={styles.label}>Birth place</Eyebrow>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={onQueryChange}
          placeholder="City, country"
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
          onSubmitEditing={onSearch}
        />
        <Button
          label={searching ? '…' : 'Search'}
          onPress={onSearch}
          variant="ghost"
          style={styles.searchBtn}
          disabled={searching}
        />
      </View>
      {!!error && <Caption style={styles.feedback}>{error}</Caption>}
      {!error && searched && results.length === 0 && !searching && (
        <Caption style={styles.feedback}>
          No places found — try a city and country (e.g. “Lisbon, Portugal”).
        </Caption>
      )}
      {results.map((p, i) => (
        <Pressable
          key={`${i}-${p.lat},${p.lng}`}
          style={[styles.result, selected?.label === p.label && styles.resultActive]}
          onPress={() => onSelect(p)}
        >
          <Text style={styles.resultText} numberOfLines={2}>{p.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: spacing.sm, marginTop: spacing.md },
  searchRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: type.body,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 16,
  },
  searchBtn: { paddingVertical: 16 },
  feedback: { marginTop: spacing.sm },
  result: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.sm + 4,
    marginTop: spacing.sm,
  },
  resultActive: { borderColor: colors.accent, borderWidth: 1.5 },
  resultText: { fontFamily: fonts.body, fontSize: type.small, color: colors.text },
});
