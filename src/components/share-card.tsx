// The shareable card. This is a NORMAL presentational component — we just
// position it off-screen and photograph it. Change the design here, the
// image changes. Signs arrive already-expanded ("Gemini"); expand at the
// call site with expandSign() from @/constants/astro.
import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing, type } from '@/constants/theme';
import { Eyebrow, TriangleMark } from '@/components/ui';
import { badgeLabel, BADGE_COLORS } from '@/constants/astro';
import type { DailyReading } from '@/lib/api';

// ---- Types for the two card variants ----
export type Big3CardData = {
  variant: 'big3';
  name: string;
  sun: string;     // already pretty-printed, e.g. "Gemini"
  moon: string;
  rising: string;
  risingApprox?: boolean; // birth time unknown
};

export type TodayCardData = {
  variant: 'today';
  headline: string;
  intensity: DailyReading['type']; // 'COLLISION' | 'TRANSIT' | 'RIPPLE' | 'WALKING'
  dateLabel: string; // e.g. "Thursday, July 9"
};

type Props = { data: Big3CardData | TodayCardData };

// forwardRef lets the parent hand us a ref that view-shot can photograph.
const ShareCard = forwardRef<View, Props>(({ data }, ref) => {
  return (
    // collapsable={false} stops Android from optimizing this View away
    // before the screenshot happens.
    <View ref={ref} collapsable={false} style={styles.card}>
      {/* Decorative star field — gold, to read as celestial rather than noise */}
      {STARS.map((s, i) => (
        <View key={i} style={[styles.star, { top: s.top, left: s.left, opacity: s.o }]} />
      ))}

      {data.variant === 'big3' ? (
        <View style={styles.body}>
          <Eyebrow style={styles.eyebrow}>{data.name}’s Big 3</Eyebrow>
          <Big3Row label="Sun" sign={data.sun} line="the engine" />
          <Big3Row label="Moon" sign={data.moon} line="the weather" />
          <Big3Row
            label="Rising"
            sign={data.rising}
            line={data.risingApprox ? 'the doorway (approx.)' : 'the doorway'}
          />
        </View>
      ) : (
        <View style={styles.body}>
          <Eyebrow style={styles.eyebrow}>{data.dateLabel}</Eyebrow>
          {/* Same label + colors the app's other badges use (WALKING shows
              as "TODAY"), from @/constants/astro. */}
          <View style={[styles.badge, { borderColor: BADGE_COLORS[data.intensity] }]}>
            <Text style={[styles.badgeText, { color: BADGE_COLORS[data.intensity] }]}>
              {badgeLabel(data.intensity)}
            </Text>
          </View>
          <Text style={styles.headline}>{data.headline}</Text>
        </View>
      )}

      {/* THE WATERMARK — styled as the card's signature, not a stamp.
          Swap the URL for the App Store link once it exists. */}
      <View style={styles.watermark}>
        <TriangleMark size={16} color={colors.gold} />
        <Text style={styles.wordmark}>NATAL</Text>
        <Text style={styles.url}>nataljournal.com</Text>
      </View>
    </View>
  );
});

ShareCard.displayName = 'ShareCard';

function Big3Row({ label, sign, line }: { label: string; sign: string; line: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowSign}>{sign}</Text>
      <Text style={styles.rowLine}>{line}</Text>
    </View>
  );
}

// Fixed "random" star positions — hardcoded so every card renders identically.
const STARS = [
  { top: 40, left: 30, o: 0.5 }, { top: 90, left: 300, o: 0.3 },
  { top: 150, left: 120, o: 0.4 }, { top: 210, left: 330, o: 0.5 },
  { top: 480, left: 40, o: 0.3 }, { top: 520, left: 280, o: 0.45 },
  { top: 570, left: 150, o: 0.35 }, { top: 60, left: 200, o: 0.25 },
];

const styles = StyleSheet.create({
  card: {
    width: 360,
    height: 640,               // 9:16 — story format
    backgroundColor: colors.bg, // cream — the card is paper, not a night sky
    borderRadius: 0,           // stories are full-bleed; no rounding
    padding: spacing.xl,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  star: {
    position: 'absolute', width: 3, height: 3, borderRadius: radius.sm,
    backgroundColor: colors.gold,
  },
  body: { flex: 1, justifyContent: 'center' },
  eyebrow: { textAlign: 'center', marginBottom: spacing.xl },
  row: { alignItems: 'center', marginBottom: spacing.xl - 2 },
  rowLabel: { fontFamily: fonts.bodyMedium, fontSize: type.small, color: colors.muted },
  rowSign: {
    fontFamily: fonts.displayBold, fontSize: 34, color: colors.text, marginVertical: 2,
  },
  rowLine: { fontFamily: fonts.displayItalic, fontSize: type.small, color: colors.accent },
  // borderColor + text color are set inline from BADGE_COLORS per intensity.
  badge: {
    alignSelf: 'center', borderWidth: 1,
    borderRadius: radius.pill, paddingHorizontal: spacing.md - 2, paddingVertical: spacing.xs + 1,
    marginBottom: spacing.lg - 2,
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 2 },
  headline: {
    fontFamily: fonts.displayBold, fontSize: type.title, color: colors.text,
    textAlign: 'center', lineHeight: 36,
  },
  watermark: { alignItems: 'center', gap: spacing.xs },
  wordmark: {
    fontFamily: fonts.bodyBold, letterSpacing: 6, fontSize: type.small, color: colors.text,
  },
  url: { fontFamily: fonts.body, fontSize: type.caption, color: colors.muted },
});

export default ShareCard;
