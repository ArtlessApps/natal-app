// Paywall stub (PRD §4.4/§4.5 + §9): every premium touchpoint in the app
// (locked Learn levels, the chart wheel's house ring, the Friends free cap)
// lands here. `reason` just decides which perk gets highlighted and where
// "back" goes — the pitch itself is the same, since it's one subscription.
// Real billing is out of scope for the MVP: this previews what's behind the
// wall and stops at a disabled CTA.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, shadow, spacing, type } from '@/constants/theme';
import { Body, Button, Caption, Eyebrow, Heading, Title } from '@/components/ui';
import { LEVELS } from '@/constants/lessons';
import { FREE_FRIEND_LIMIT, MAX_FRIENDS } from '@/lib/friends';

type Reason = 'houses' | 'aspects' | 'transits' | 'friends';

const COPY: Record<Reason | 'default', { eyebrow: string; title: string; subtitle: string; back: string; backHref: '/(tabs)/learn' | '/(tabs)/friends' | '/(tabs)/chart' }> = {
  default: {
    eyebrow: 'Natal Premium',
    title: 'Read your whole chart',
    subtitle: 'You’ve got your Big 3 and your planets. Premium unlocks the rest of the picture — where each energy lives and how the pieces talk to each other.',
    back: '← Learn',
    backHref: '/(tabs)/learn',
  },
  houses: {
    eyebrow: 'Natal Premium',
    title: 'See where it plays out',
    subtitle: 'Your chart wheel shows every house — premium unlocks what each one means for your life.',
    back: '← My Chart',
    backHref: '/(tabs)/chart',
  },
  aspects: {
    eyebrow: 'Natal Premium',
    title: 'See how your chart talks to itself',
    subtitle: 'Those lines connecting your planets aren’t decoration — premium unlocks what each aspect actually means.',
    back: '← Learn',
    backHref: '/(tabs)/learn',
  },
  transits: {
    eyebrow: 'Natal Premium',
    title: 'See how today moves through your chart',
    subtitle: 'You get the daily headline for free. Premium unlocks the full mechanics behind every transit.',
    back: '← Learn',
    backHref: '/(tabs)/learn',
  },
  friends: {
    eyebrow: 'Natal Premium',
    title: 'Compare with more friends',
    subtitle: `You’ve used your ${FREE_FRIEND_LIMIT} free comparisons. Premium raises your list to ${MAX_FRIENDS}.`,
    back: '← Friends',
    backHref: '/(tabs)/friends',
  },
};

// One shared "what premium gets you" pitch, independent of chart_json —
// Learn's locked levels plus the Friends cap raise, so the paywall always
// makes the full case regardless of which door the user walked in through.
const PERKS: { id: Reason; badge: string; title: string; subtitle: string }[] = [
  ...LEVELS.filter((l) => l.locked).map((l) => ({
    id: l.id as Reason,
    badge: `Level ${l.index}`,
    title: l.title,
    subtitle: l.subtitle,
  })),
  {
    id: 'friends',
    badge: 'Friends',
    title: `Up to ${MAX_FRIENDS} friends`,
    subtitle: `Compare charts with more than the free ${FREE_FRIEND_LIMIT}.`,
  },
];

export default function Paywall() {
  const router = useRouter();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const copy = COPY[(reason as Reason) ?? 'default'] ?? COPY.default;

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace(copy.backHref);
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.container}>
      <Pressable onPress={goBack}><Text style={styles.back}>{copy.back}</Text></Pressable>

      <Eyebrow>{copy.eyebrow}</Eyebrow>
      <Title style={styles.title}>{copy.title}</Title>
      <Body style={styles.subtitle}>{copy.subtitle}</Body>

      {PERKS.map((perk) => (
        <View key={perk.id} style={[styles.card, perk.id === reason && styles.cardHighlight]}>
          <Text style={styles.cardIndex}>{perk.badge}</Text>
          <Heading style={styles.cardTitle}>{perk.title}</Heading>
          <Caption style={styles.cardSub}>{perk.subtitle}</Caption>
        </View>
      ))}

      <Button label="Coming soon" onPress={() => {}} disabled style={styles.button} />
      <Caption style={styles.note}>Purchasing isn’t available yet — check back soon.</Caption>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingTop: 60, paddingBottom: spacing.xxl },
  back: { color: colors.accent, fontSize: 15, marginBottom: spacing.lg },
  title: { marginTop: spacing.xs },
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg - 2,
    marginBottom: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardHighlight: { borderColor: colors.terracotta, borderWidth: 1.5 },
  cardIndex: { fontFamily: fonts.bodySemibold, fontSize: type.caption, letterSpacing: 2, color: colors.muted },
  cardTitle: { fontSize: type.body + 2, marginTop: spacing.xs },
  cardSub: { marginTop: 2 },
  button: { marginTop: spacing.lg },
  note: { textAlign: 'center', marginTop: spacing.sm + 4 },
});
