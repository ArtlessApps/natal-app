// Filter chips for the Journal list (PRD 4.3): transit planet, aspect type,
// intensity, Full/New Moon. Collapsed behind a "Filters" toggle so the
// default list view stays clean.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { PLANET_GLYPHS } from '@/constants/astro';

export type JournalFilters = {
  planet: string | null;
  aspect: string | null;
  intensity: string | null;
  phase: string | null;
};

export const EMPTY_FILTERS: JournalFilters = { planet: null, aspect: null, intensity: null, phase: null };

const PLANETS = Object.keys(PLANET_GLYPHS);
const ASPECTS = ['conjunction', 'sextile', 'square', 'trine', 'opposition'];
const INTENSITIES = ['COLLISION', 'TRANSIT', 'RIPPLE', 'WALKING'];
const PHASES = [{ key: 'New', label: 'New Moon' }, { key: 'Full', label: 'Full Moon' }];

type Props = {
  filters: JournalFilters;
  onChange: (filters: JournalFilters) => void;
};

function ChipRow<T extends string>({
  options, active, onSelect, render,
}: {
  options: T[];
  active: T | null;
  onSelect: (v: T | null) => void;
  render?: (v: T) => string;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
      {options.map((opt) => {
        const isActive = active === opt;
        return (
          <Pressable
            key={opt}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onSelect(isActive ? null : opt)}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {render ? render(opt) : opt}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function JournalFilters({ filters, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <View>
      <Pressable style={styles.toggle} onPress={() => setExpanded((v) => !v)}>
        <Text style={styles.toggleText}>
          Filters{activeCount > 0 ? ` (${activeCount})` : ''} {expanded ? '▲' : '▼'}
        </Text>
        {activeCount > 0 && (
          <Pressable onPress={() => onChange(EMPTY_FILTERS)}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        )}
      </Pressable>
      {expanded && (
        <View style={styles.panel}>
          <Text style={styles.label}>Planet</Text>
          <ChipRow options={PLANETS} active={filters.planet}
            onSelect={(v) => onChange({ ...filters, planet: v })}
            render={(p) => `${p} ${PLANET_GLYPHS[p]}`} />

          <Text style={styles.label}>Aspect</Text>
          <ChipRow options={ASPECTS} active={filters.aspect}
            onSelect={(v) => onChange({ ...filters, aspect: v })} />

          <Text style={styles.label}>Intensity</Text>
          <ChipRow options={INTENSITIES} active={filters.intensity}
            onSelect={(v) => onChange({ ...filters, intensity: v })} />

          <Text style={styles.label}>Moon</Text>
          <ChipRow options={PHASES.map((p) => p.key)} active={filters.phase}
            onSelect={(v) => onChange({ ...filters, phase: v })}
            render={(k) => PHASES.find((p) => p.key === k)?.label ?? k} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  toggleText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  clear: { color: colors.accent, fontSize: 13 },
  panel: { marginBottom: 16 },
  label: { color: colors.muted, fontSize: 11, letterSpacing: 1, marginTop: 10, marginBottom: 6 },
  chipRow: { flexDirection: 'row' },
  chip: {
    borderWidth: 1, borderColor: colors.surface, backgroundColor: colors.surface,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextActive: { color: colors.bg, fontWeight: '600' },
});
