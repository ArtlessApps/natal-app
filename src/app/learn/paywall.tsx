// Paywall stub (PRD §4.4 + §9): Levels 3–5 are premium. Real billing is out
// of scope for the MVP, so this just previews what's behind the wall and
// stops at a disabled CTA. No purchase flow is wired up yet.
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { LEVELS } from '@/constants/lessons';

export default function Paywall() {
  const router = useRouter();
  const lockedLevels = LEVELS.filter((l) => l.locked);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/learn');
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.container}>
      <Pressable onPress={goBack}><Text style={styles.back}>← Learn</Text></Pressable>

      <Text style={styles.eyebrow}>NATAL PREMIUM</Text>
      <Text style={styles.title}>Read your whole chart</Text>
      <Text style={styles.subtitle}>
        You’ve got your Big 3 and your planets. Premium unlocks the rest of the
        picture — where each energy lives and how the pieces talk to each other.
      </Text>

      {lockedLevels.map((level) => (
        <View key={level.id} style={styles.card}>
          <Text style={styles.cardIndex}>LEVEL {level.index}</Text>
          <Text style={styles.cardTitle}>{level.title}</Text>
          <Text style={styles.cardSub}>{level.subtitle}</Text>
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
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 18, marginBottom: 12 },
  cardIndex: { color: colors.muted, fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 4 },
  cardSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  button: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20, opacity: 0.5 },
  buttonText: { color: colors.bg, fontWeight: '700', fontSize: 16 },
  note: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 12 },
});
