// Echo card on Today (PRD §4.2 + MONETIZATION §4.1): one past entry whose
// transit tag matches today's. First Echo is free (full text); later Echoes
// for free users show the real entry blurred with an unlock CTA.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { colors, fonts, radius, spacing, type } from '@/constants/theme';
import { Button } from '@/components/ui';
import PaywallSheet from '@/components/PaywallSheet';
import { transitTag } from '@/constants/astro';
import { echoLeadIn, findEcho, resolveEchoAccess, type EchoMatch } from '@/lib/echo';
import { useIsPlus } from '@/lib/subscription';
import type { DailyDriver } from '@/lib/api';

type Props = {
  userId: string;
  entryDate: string;
  driver: DailyDriver;
};

function formatDate(entryDate: string): string {
  return new Date(`${entryDate}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function EchoCard({ userId, entryDate, driver }: Props) {
  const router = useRouter();
  const isPlus = useIsPlus();
  const [match, setMatch] = useState<EchoMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<'full' | 'tease' | null>(null);
  const [paywall, setPaywall] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setAccess(null);
    findEcho(userId, entryDate, driver).then(async (result) => {
      if (cancelled) return;
      setMatch(result);
      if (result) {
        const next = await resolveEchoAccess(result.entry.id, isPlus);
        if (!cancelled) setAccess(next);
      }
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, entryDate, driver.transit_planet, driver.natal_planet, driver.aspect, isPlus]);

  if (loading) {
    return <ActivityIndicator color={colors.accent} style={styles.spinner} />;
  }
  if (!match || !access) return null;

  const { entry } = match;
  const tag = transitTag(entry.transit_planet, entry.aspect, entry.natal_planet);
  const teased = access === 'tease';

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>ECHO</Text>
      {/* Header always visible — even when the body is teased. */}
      <Text style={styles.leadIn}>{echoLeadIn(driver)}, you wrote…</Text>

      <View style={styles.card}>
        <Text style={styles.date}>{formatDate(entry.entry_date)}</Text>

        {/* Real entry text is always rendered; blur sits on top for free users. */}
        <View style={styles.excerptWrap}>
          <Text style={styles.excerpt} numberOfLines={teased ? 4 : 3}>
            {entry.text}
          </Text>
          {teased && (
            <BlurView intensity={28} tint="light" style={styles.blur}>
              <Button
                label="Unlock with Natal Plus"
                onPress={() => setPaywall(true)}
                variant="terracotta"
              />
            </BlurView>
          )}
        </View>

        {!!tag && !teased && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{tag}</Text>
          </View>
        )}
        {!teased && (
          <Pressable
            onPress={() => router.push(`/journal/${entry.id}`)}
            accessibilityRole="button"
            accessibilityLabel="Open past journal entry"
          >
            <Text style={styles.link}>Read entry →</Text>
          </Pressable>
        )}
      </View>

      <PaywallSheet
        visible={paywall}
        source="echo_tease"
        onClose={() => setPaywall(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 28 },
  spinner: { marginTop: 28 },
  label: {
    fontFamily: fonts.bodySemibold,
    color: colors.muted,
    fontSize: type.caption,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  leadIn: {
    fontFamily: fonts.bodySemibold,
    color: colors.text,
    fontSize: type.body,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  date: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: type.caption,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  excerptWrap: { position: 'relative', minHeight: 72 },
  excerpt: {
    fontFamily: fonts.body,
    color: colors.text,
    fontSize: type.small + 1,
    lineHeight: 21,
    fontStyle: 'italic',
  },
  blur: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    overflow: 'hidden',
    borderRadius: radius.sm,
  },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: spacing.md,
  },
  chipText: { fontFamily: fonts.body, color: colors.accent, fontSize: type.caption },
  link: {
    fontFamily: fonts.bodySemibold,
    color: colors.accent,
    fontSize: type.small,
    marginTop: spacing.md,
  },
});
