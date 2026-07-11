// The Big 3 reveal cards (Sun / Moon / Rising), shared by the reveal screen
// and the invite guest page so both render the identity payoff identically.
import { StyleSheet } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { Caption, Card, Eyebrow, Heading, Tagline } from '@/components/ui';
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
        <Card key={r.key} style={styles.card}>
          <Eyebrow>{r.label}</Eyebrow>
          <Heading style={styles.sign}>{expandSign(r.sign)}</Heading>
          <Tagline style={styles.line}>{ONE_LINERS[r.key]}</Tagline>
          {r.key === 'rising' && !timeKnown && (
            <Caption style={styles.caveat}>Approximate — birth time unknown</Caption>
          )}
        </Card>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  sign: { marginTop: spacing.xs, marginBottom: spacing.xs },
  line: { fontSize: 15 },
  caveat: { color: colors.accent, marginTop: spacing.sm },
});
