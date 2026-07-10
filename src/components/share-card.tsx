// The shareable card. This is a NORMAL presentational component — we just
// position it off-screen and photograph it. Change the design here, the
// image changes. Signs arrive already-expanded ("Gemini"); expand at the
// call site with expandSign() from @/constants/astro.
import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
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
      {/* Decorative star field — cheap texture with absolutely-positioned dots */}
      {STARS.map((s, i) => (
        <View key={i} style={[styles.star, { top: s.top, left: s.left, opacity: s.o }]} />
      ))}

      {data.variant === 'big3' ? (
        <View style={styles.body}>
          <Text style={styles.eyebrow}>{data.name.toUpperCase()}’S BIG 3</Text>
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
          <Text style={styles.eyebrow}>{data.dateLabel.toUpperCase()}</Text>
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
    backgroundColor: colors.bg,
    borderRadius: 0,           // stories are full-bleed; no rounding
    padding: 32,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  star: {
    position: 'absolute', width: 3, height: 3, borderRadius: 2,
    backgroundColor: colors.text,
  },
  body: { flex: 1, justifyContent: 'center' },
  eyebrow: {
    color: colors.muted, letterSpacing: 4, fontSize: 12,
    textAlign: 'center', marginBottom: 28,
  },
  row: { alignItems: 'center', marginBottom: 26 },
  rowLabel: { color: colors.muted, fontSize: 13 },
  rowSign: { color: colors.text, fontSize: 34, fontWeight: '700', marginVertical: 2 },
  rowLine: { color: colors.accent, fontSize: 13 },
  // borderColor + text color are set inline from BADGE_COLORS per intensity.
  badge: {
    alignSelf: 'center', borderWidth: 1,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 22,
  },
  badgeText: { fontSize: 11, letterSpacing: 2 },
  headline: {
    color: colors.text, fontSize: 26, fontWeight: '600',
    textAlign: 'center', lineHeight: 36,
  },
  watermark: { alignItems: 'center' },
  wordmark: { color: colors.text, letterSpacing: 6, fontSize: 14, fontWeight: '700' },
  url: { color: colors.muted, fontSize: 11, marginTop: 4 },
});

export default ShareCard;
