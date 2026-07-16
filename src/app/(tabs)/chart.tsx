// My Chart tab (PRD §4.6): a full wheel graphic — every wedge and glyph
// tappable — plus a detail list underneath for the exact degree/house text
// the wheel's small glyphs can't comfortably show. Big 3 share card sits at
// the top per PRD §8.5D.
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { Body, Button, Eyebrow, Title } from '@/components/ui';
import { expandSign, PLANET_GLYPHS } from '@/constants/astro';
import { lessonIdForBig3Key, lessonIdForPlanetKey } from '@/constants/lessons';
import { getChart, getCompletedLessonIds, resolvePlacement, type Chart, type Placementish } from '@/lib/learn';
import { useIsPlus } from '@/lib/subscription';
import { supabase } from '@/lib/supabase';
import Big3Cards, { type Big3Key } from '@/components/big3-cards';
import ChartWheel from '@/components/chart-wheel';
import LockedFeatureRow from '@/components/locked-feature-row';
import PaywallSheet, { type PaywallSource } from '@/components/PaywallSheet';
import PlacementRow from '@/components/placement-row';
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
  const isPlus = useIsPlus();
  const [name, setName] = useState('');
  const [chart, setChart] = useState<Chart | null>(null);
  const [birthTimeKnown, setBirthTimeKnown] = useState(true);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [paywallSource, setPaywallSource] = useState<PaywallSource | null>(null);
  const { cardRef, share, sharing } = useShareCard();

  const load = useCallback(() => {
    let active = true;
    (async () => {
      const [{ chart: c, birthTimeKnown: bt }, done, { data: { user } }] = await Promise.all([
        getChart(),
        getCompletedLessonIds(),
        supabase.auth.getUser(),
      ]);
      const profile = user
        ? await supabase.from('profiles').select('name').eq('id', user.id).single()
        : null;
      if (!active) return;
      setChart(c);
      setBirthTimeKnown(bt);
      setCompleted(done);
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
        <Body style={styles.error}>We couldn’t load your chart.</Body>
      </View>
    );
  }

  const rows = PLANET_KEYS
    .map((key) => ({ key, placement: resolvePlacement(chart, key, birthTimeKnown) }))
    .filter((r): r is { key: string; placement: Placementish } => r.placement != null);

  const exploredPlanetKeys = new Set(
    PLANET_KEYS.filter((key) => {
      const lessonId = lessonIdForPlanetKey(key);
      return lessonId != null && completed.has(lessonId);
    }),
  );

  const exploredBig3Keys = new Set<Big3Key>(
    (['sun', 'moon', 'rising'] as const).filter((key) => {
      const lessonId = lessonIdForBig3Key(key);
      return lessonId != null && completed.has(lessonId);
    }),
  );

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.container}>
      <Title>My Chart</Title>
      <Body style={styles.subtitle}>Your whole sky, at a glance — tap any planet, house, or sign.</Body>

      <ChartWheel
        chart={chart}
        exploredPlanetKeys={exploredPlanetKeys}
        onPlanetPress={(planetKey) => {
          const lessonId = lessonIdForPlanetKey(planetKey);
          if (lessonId) router.push(`/learn/${lessonId}`);
        }}
        // Houses = full-chart interpretation beyond Big 3 (MONETIZATION §4.3).
        onHousePress={() => {
          if (isPlus) router.push('/(tabs)/learn');
          else setPaywallSource('chart_interpretation');
        }}
      />

      {!isPlus && (
        <LockedFeatureRow
          title="Transit calendar"
          subtitle="See what’s coming through your chart — Natal Plus."
          onPress={() => setPaywallSource('transit_calendar')}
        />
      )}

      <Eyebrow style={styles.big3Label}>Your Big 3</Eyebrow>
      <Big3Cards
        big3={chart.big3}
        timeKnown={birthTimeKnown}
        exploredKeys={exploredBig3Keys}
        onCardPress={(key: Big3Key) => {
          const lessonId = lessonIdForBig3Key(key);
          if (lessonId) router.push(`/learn/${lessonId}`);
        }}
      />

      <Button
        label={sharing ? 'Preparing…' : 'Share my Big 3'}
        onPress={share}
        disabled={sharing}
        variant="terracotta"
        style={styles.shareButton}
      />

      <Eyebrow style={styles.placementsLabel}>Placement Details</Eyebrow>
      {rows.map(({ key, placement }) => {
        const lessonId = lessonIdForPlanetKey(key);
        const glyph = PLANET_GLYPHS[key] ?? '✦';
        return (
          <PlacementRow
            key={key}
            glyph={glyph}
            planetName={key === 'Ascendant' ? 'Rising' : key}
            placement={placement}
            explored={lessonId ? completed.has(lessonId) : false}
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

      <PaywallSheet
        visible={paywallSource != null}
        source={paywallSource ?? 'chart_interpretation'}
        onClose={() => setPaywallSource(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  container: { padding: spacing.lg, paddingTop: 70, paddingBottom: spacing.xxl },
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.lg },
  error: { color: colors.error },

  big3Label: { marginTop: spacing.xl },
  placementsLabel: { marginTop: spacing.xl },

  shareButton: { marginTop: spacing.xs, marginBottom: spacing.sm },
});
