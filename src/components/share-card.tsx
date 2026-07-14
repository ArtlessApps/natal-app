// The shareable card. This is a NORMAL presentational component — we just
// position it off-screen and photograph it. Change the design here, the
// image changes. Signs arrive already-expanded ("Gemini"); expand at the
// call site with expandSign() from @/constants/astro.
import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts, radius, spacing } from '@/constants/theme';
import { TriangleMark } from '@/components/ui';
import { BIG3_ONE_LINERS } from '@/components/big3-cards';
import { badgeLabel, BADGE_COLORS, signGlyph } from '@/constants/astro';
import type { DailyReading } from '@/lib/api';

// Force iOS to render zodiac symbols as text (gold) instead of purple emoji.
const TXT = '\uFE0E';

// Dark share-card palette — tuned for screenshot legibility, not the app theme.
const card = {
  bg: '#211f2c',
  gold: '#d4a95f',
  goldDot: '#b8873f',
  desc: '#b8b3c4',
  sign: '#f7f4ee',
  signLead: '#ffffff',
};

const BIG3_ROWS = [
  { key: 'sun' as const, planetGlyph: '☉', label: 'SUN' },
  { key: 'moon' as const, planetGlyph: '☽', label: 'MOON' },
  { key: 'rising' as const, planetGlyph: '↑', label: 'RISING' },
];

// Share card uses tighter copy than in-app Big 3 cards where noted.
const SHARE_LINES = {
  sun: BIG3_ONE_LINERS.sun,
  moon: BIG3_ONE_LINERS.moon,
  rising: 'How others see you.',
};

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
  body: string;
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
      {STARS.map((s, i) => (
        <View
          key={i}
          style={[
            styles.star,
            s.top != null && { top: s.top },
            s.left != null && { left: s.left },
            s.bottom != null && { bottom: s.bottom },
          ]}
        />
      ))}

      <View style={styles.content}>
        {data.variant === 'big3' ? (
          <>
            <Text style={styles.header}>{data.name.toUpperCase()}'S BIG 3</Text>
            {BIG3_ROWS.map((row) => (
              <Big3Row
                key={row.key}
                planetGlyph={row.planetGlyph}
                label={row.label}
                sign={data[row.key]}
                line={SHARE_LINES[row.key]}
                lead={row.key === 'sun'}
                caveat={row.key === 'rising' && data.risingApprox
                  ? 'Approximate — birth time unknown'
                  : undefined}
              />
            ))}
          </>
        ) : (
          <>
            <Text style={styles.header}>{data.dateLabel.toUpperCase()}</Text>
            <View style={styles.todayBody}>
              <View style={[styles.badge, { borderColor: BADGE_COLORS[data.intensity] }]}>
                <Text style={[styles.badgeText, { color: BADGE_COLORS[data.intensity] }]}>
                  {badgeLabel(data.intensity)}
                </Text>
              </View>
              <Text style={styles.todayHeadline}>{data.headline}</Text>
              <Text style={styles.todayReading}>{data.body}</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <TriangleMark size={14} color={card.gold} />
        <Text style={styles.wordmark}>nataljournal.com</Text>
      </View>
    </View>
  );
});

ShareCard.displayName = 'ShareCard';

function Big3Row({
  planetGlyph, label, sign, line, lead, caveat,
}: {
  planetGlyph: string;
  label: string;
  sign: string;
  line: string;
  lead?: boolean;
  caveat?: string;
}) {
  const glyph = signGlyph(sign);
  return (
    <View style={styles.section}>
      <Text style={styles.catLabel}>{planetGlyph} {label}</Text>
      <Text style={styles.desc}>{line}</Text>
      <View style={styles.signRow}>
        {glyph ? (
          <Text style={[styles.signGlyph, lead && styles.signGlyphLead]}>{glyph + TXT}</Text>
        ) : null}
        <Text style={[styles.signName, lead && styles.signNameLead]}>{sign}</Text>
      </View>
      {caveat && <Text style={styles.caveat}>{caveat}</Text>}
    </View>
  );
}

// Star positions scaled from the 320×568 mockup to our 360×640 capture size.
const STARS = [
  { top: 45, left: 34 },
  { top: 90, left: 312 },
  { top: 248, left: 23 },
  { top: 338, left: 329 },
  { top: 473, left: 56 },
  { bottom: 113, left: 289 },
];

const styles = StyleSheet.create({
  card: {
    width: 360,
    height: 640,               // 9:16 — story format
    backgroundColor: card.bg,
    borderRadius: 0,           // stories are full-bleed; no rounding
    overflow: 'hidden',
  },
  star: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: card.goldDot,
    opacity: 0.6,
  },
  content: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  header: {
    textAlign: 'center',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 3,
    color: card.gold,
    alignSelf: 'center',
  },
  section: {
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingTop: 14,
  },
  catLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 3,
    color: card.gold,
    textAlign: 'center',
    alignSelf: 'center',
  },
  desc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: card.desc,
    textAlign: 'center',
    alignSelf: 'center',
    lineHeight: 18.2,
    marginTop: 6,
    marginBottom: 2,
  },
  signRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginVertical: 4,
  },
  signGlyph: {
    fontFamily: fonts.body,
    fontSize: 26,
    color: card.gold,
    lineHeight: 34,
  },
  signGlyphLead: {
    fontSize: 32,
    lineHeight: 42,
  },
  signName: {
    fontFamily: fonts.displayBold,
    fontSize: 34,
    color: card.sign,
    textAlign: 'center',
  },
  signNameLead: {
    fontSize: 42,
    color: card.signLead,
  },
  caveat: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: card.desc,
    marginTop: spacing.xs,
    textAlign: 'center',
    alignSelf: 'center',
  },
  todayBody: {
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingTop: 14,
    gap: spacing.md,
  },
  badge: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.xs + 1,
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 2 },
  todayHeadline: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: card.signLead,
    textAlign: 'center',
    alignSelf: 'center',
    lineHeight: 30,
  },
  todayReading: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: card.desc,
    textAlign: 'center',
    alignSelf: 'center',
    lineHeight: 21,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 4,
  },
  wordmark: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: card.sign,
  },
});

export default ShareCard;
