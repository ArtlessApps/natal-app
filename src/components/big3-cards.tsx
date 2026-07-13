// The Big 3 reveal cards (Sun / Moon / Rising), shared by the reveal screen
// and the invite guest page so both render the identity payoff identically.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { Caption, Card, Eyebrow, Heading, Tagline } from '@/components/ui';
import { expandSign } from '@/constants/astro';
import type { Big3 } from '@/lib/api';

export type Big3Key = 'sun' | 'moon' | 'rising';

const ONE_LINERS: Record<Big3Key, string> = {
  sun: 'Your core identity, ego, and life purpose.',
  moon: 'Your emotions and instincts.',
  rising: 'How others see you and how you engage the world.',
};

export default function Big3Cards({
  big3,
  timeKnown = true,
  onCardPress,
}: {
  big3: Big3;
  timeKnown?: boolean;
  onCardPress?: (key: Big3Key) => void;
}) {
  const rows: { key: Big3Key; label: string; sign: string }[] = [
    { key: 'sun', label: 'Sun', sign: big3.sun },
    { key: 'moon', label: 'Moon', sign: big3.moon },
    { key: 'rising', label: 'Rising', sign: big3.rising },
  ];
  return (
    <>
      {rows.map((r) => {
        const content = (
          <>
            <View style={styles.header}>
              <Eyebrow>{r.label}</Eyebrow>
              {onCardPress && <Text style={styles.chevron}>›</Text>}
            </View>
            <Tagline style={styles.line}>{ONE_LINERS[r.key]}</Tagline>
            <Heading style={styles.sign}>{expandSign(r.sign)}</Heading>
            {r.key === 'rising' && !timeKnown && (
              <Caption style={styles.caveat}>Approximate — birth time unknown</Caption>
            )}
          </>
        );
        if (!onCardPress) {
          return (
            <Card key={r.key} style={styles.card}>
              {content}
            </Card>
          );
        }
        return (
          <Pressable
            key={r.key}
            onPress={() => onCardPress(r.key)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <Card style={styles.cardFill}>{content}</Card>
          </Pressable>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  cardFill: { marginBottom: 0 },
  pressed: { opacity: 0.85 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chevron: { color: colors.muted, fontSize: 22 },
  sign: { marginTop: spacing.sm },
  line: { marginTop: spacing.xs, fontSize: 15 },
  caveat: { color: colors.accent, marginTop: spacing.sm },
});
