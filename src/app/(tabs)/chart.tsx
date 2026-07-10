// My Chart tab (PRD §4.6): a full wheel graphic — every wedge and glyph
// tappable — plus a detail list underneath for the exact degree/house text
// the wheel's small glyphs can't comfortably show. Big 3 share card sits at
// the top per PRD §8.5D.
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { expandSign, houseOrdinal, PLANET_GLYPHS } from '@/constants/astro';
import { lessonIdForPlanetKey } from '@/constants/lessons';
import { getChart, resolvePlacement, type Chart, type Placementish } from '@/lib/learn';
import { supabase } from '@/lib/supabase';
import Big3Cards from '@/components/big3-cards';
import ChartWheel from '@/components/chart-wheel';
import ShareCard from '@/components/share-card';
import { useShareCard } from '@/lib/use-share-card';

// Traditional order: angles first, then luminaries, then the rest outward
// from the Sun. Ascendant isn't in chart_json.placements — resolvePlacement
// pulls it from big3.rising instead (see lib/learn.ts).
const PLANET_KEYS = [
  'Ascendant', 'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
];

export default function ChartScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [chart, setChart] = useState<Chart | null>(null);
  const [birthTimeKnown, setBirthTimeKnown] = useState(true);
  const [loading, setLoading] = useState(true);
  const { cardRef, share, sharing } = useShareCard();

  const load = useCallback(() => {
    let active = true;
    (async () => {
      const [{ chart: c, birthTimeKnown: bt }, { data: { user } }] = await Promise.all([
        getChart(),
        supabase.auth.getUser(),
      ]);
      const profile = user
        ? await supabase.from('profiles').select('name').eq('id', user.id).single()
        : null;
      if (!active) return;
      setChart(c);
      setBirthTimeKnown(bt);
      setName(profile?.data?.name ?? '');
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  useFocusEffect(load);

  if (loading) {
    return (
      <View style={[styles.wrap, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!chart) {
    return (
      <View style={[styles.wrap, styles.center]}>
        <Text style={styles.error}>We couldn’t load your chart.</Text>
      </View>
    );
  }

  const rows = PLANET_KEYS
    .map((key) => ({ key, placement: resolvePlacement(chart, key, birthTimeKnown) }))
    .filter((r): r is { key: string; placement: Placementish } => r.placement != null);

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.container}>
      <Text style={styles.title}>My Chart</Text>
      <Text style={styles.subtitle}>Your whole sky, at a glance — tap any planet, house, or sign.</Text>

      <ChartWheel
        chart={chart}
        onPlanetPress={(planetKey) => {
          const lessonId = lessonIdForPlanetKey(planetKey);
          if (lessonId) router.push(`/learn/${lessonId}`);
        }}
        onHousePress={() => router.push('/learn/paywall')}
      />

      <Text style={[styles.sectionLabel, styles.big3Label]}>YOUR BIG 3</Text>
      <Big3Cards big3={chart.big3} timeKnown={birthTimeKnown} />

      <Pressable style={styles.shareButton} onPress={share} disabled={sharing}>
        <Text style={styles.shareButtonText}>{sharing ? 'Preparing…' : 'Share my Big 3'}</Text>
      </Pressable>

      <Text style={[styles.sectionLabel, styles.placementsLabel]}>PLACEMENT DETAILS</Text>
      {rows.map(({ key, placement }) => {
        const lessonId = lessonIdForPlanetKey(key);
        const glyph = PLANET_GLYPHS[key] ?? '✦';
        return (
          <PlacementRow
            key={key}
            glyph={glyph}
            planetName={key === 'Ascendant' ? 'Rising' : key}
            placement={placement}
            onPress={lessonId ? () => router.push(`/learn/${lessonId}`) : undefined}
          />
        );
      })}

      {/* Off-screen render target for the share card capture. */}
      <View style={{ position: 'absolute', left: -9999 }}>
        <ShareCard
          ref={cardRef}
          data={{
            variant: 'big3',
            name,
            sun: expandSign(chart.big3.sun),
            moon: expandSign(chart.big3.moon),
            rising: expandSign(chart.big3.rising),
            risingApprox: !birthTimeKnown,
          }}
        />
      </View>
    </ScrollView>
  );
}

function PlacementRow({
  glyph, planetName, placement, onPress,
}: {
  glyph: string;
  planetName: string;
  placement: Placementish;
  onPress?: () => void;
}) {
  const sign = placement.degree != null
    ? `${placement.signFull} ${Math.floor(placement.degree)}°`
    : placement.signFull;
  const meta = [
    placement.house ? `${houseOrdinal(placement.house)} house` : null,
    placement.retrograde ? 'retrograde' : null,
  ].filter(Boolean).join(' · ');

  const Row = onPress ? Pressable : View;
  return (
    <Row style={styles.row} onPress={onPress}>
      <Text style={styles.rowGlyph}>{glyph}</Text>
      <View style={styles.rowBody}>
        <Text style={styles.rowPlanet}>{planetName}</Text>
        <Text style={styles.rowMeta}>
          {sign}{meta ? ` · ${meta}` : ''}
          {placement.approximate && !placement.house ? ' (approx.)' : ''}
        </Text>
      </View>
      {onPress && <Text style={styles.chevron}>›</Text>}
    </Row>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  container: { padding: 24, paddingTop: 70, paddingBottom: 60 },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: colors.muted, fontSize: 14, marginBottom: 24, lineHeight: 20 },
  error: { color: colors.error, fontSize: 15 },

  sectionLabel: { color: colors.muted, fontSize: 12, letterSpacing: 2, fontWeight: '700', marginBottom: 12 },
  big3Label: { marginTop: 32 },
  placementsLabel: { marginTop: 28 },

  shareButton: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accent,
    borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4, marginBottom: 8,
  },
  shareButtonText: { color: colors.accent, fontWeight: '600', fontSize: 15 },

  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 12, padding: 14, marginTop: 8,
  },
  rowGlyph: { color: colors.accent, fontSize: 20, width: 30, textAlign: 'center' },
  rowBody: { flex: 1, marginLeft: 6 },
  rowPlanet: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  chevron: { color: colors.muted, fontSize: 22, marginLeft: 8 },
});
