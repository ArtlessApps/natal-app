// Paywall stub (PRD §4.4/§4.5 + §9): every premium touchpoint in the app
// (locked Learn levels, the chart wheel's house ring, the Friends free cap)
// lands here. `reason` just decides which perk gets highlighted and where
// "back" goes — the pitch itself is the same, since it's one subscription.
// Real billing is out of scope for the MVP: this previews what's behind the
// wall and stops at a disabled CTA.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { LEVELS } from '@/constants/lessons';
import { FREE_FRIEND_LIMIT, MAX_FRIENDS } from '@/lib/friends';

type Reason = 'houses' | 'aspects' | 'transits' | 'friends';

const COPY: Record<Reason | 'default', { eyebrow: string; title: string; subtitle: string; back: string; backHref: '/(tabs)/learn' | '/(tabs)/friends' | '/(tabs)/chart' }> = {
  default: {
    eyebrow: 'NATAL PREMIUM',
    title: 'Read your whole chart',
    subtitle: 'You’ve got your Big 3 and your planets. Premium unlocks the rest of the picture — where each energy lives and how the pieces talk to each other.',
    back: '← Learn',
    backHref: '/(tabs)/learn',
  },
  houses: {
    eyebrow: 'NATAL PREMIUM',
    title: 'See where it plays out',
    subtitle: 'Your chart wheel shows every house — premium unlocks what each one means for your life.',
    back: '← My Chart',
    backHref: '/(tabs)/chart',
  },
  aspects: {
    eyebrow: 'NATAL PREMIUM',
    title: 'See how your chart talks to itself',
    subtitle: 'Those lines connecting your planets aren’t decoration — premium unlocks what each aspect actually means.',
    back: '← Learn',
    backHref: '/(tabs)/learn',
  },
  transits: {
    eyebrow: 'NATAL PREMIUM',
    title: 'See how today moves through your chart',
    subtitle: 'You get the daily headline for free. Premium unlocks the full mechanics behind every transit.',
    back: '← Learn',
    backHref: '/(tabs)/learn',
  },
  friends: {
    eyebrow: 'NATAL PREMIUM',
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
    badge: `LEVEL ${l.index}`,
    title: l.title,
    subtitle: l.subtitle,
  })),
  {
    id: 'friends',
    badge: 'FRIENDS',
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

      <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.subtitle}>{copy.subtitle}</Text>

      {PERKS.map((perk) => (
        <View key={perk.id} style={[styles.card, perk.id === reason && styles.cardHighlight]}>
          <Text style={styles.cardIndex}>{perk.badge}</Text>
          <Text style={styles.cardTitle}>{perk.title}</Text>
          <Text style={styles.cardSub}>{perk.subtitle}</Text>
        </View>
      ))}

      <Pressable style={styles.button} disabled>
        <Text style={styles.buttonText}>Coming soon</Text>
      </Pressable>
      <Text style={styles.note}>Purchasing isn’t available yet — check back soon.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  back: { color: colors.accent, fontSize: 15, marginBottom: 20 },
  eyebrow: { color: colors.accent, fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', marginTop: 6 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10, marginBottom: 24 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: colors.surface },
  cardHighlight: { borderColor: colors.accent },
  cardIndex: { color: colors.muted, fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 4 },
  cardSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  button: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20, opacity: 0.5 },
  buttonText: { color: colors.bg, fontWeight: '700', fontSize: 16 },
  note: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 12 },
});
