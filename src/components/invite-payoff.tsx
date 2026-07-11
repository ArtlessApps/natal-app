// The invite page's payoff moments (landing + locked phases): a gold star,
// a Hero headline, and whatever follow-up content the phase needs.
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { Hero } from '@/components/ui';

export default function InvitePayoff({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.landing}>
      <Text style={styles.glyph}>✦</Text>
      <Hero style={styles.title}>{title}</Hero>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  landing: { alignItems: 'center', gap: spacing.md },
  glyph: { color: colors.gold, fontSize: 40 },
  title: { textAlign: 'center' },
});
