// Small reusable building blocks so every screen looks like it came from
// the same designer. Instead of restyling raw <Text> on every screen, you
// compose these. Example usage:
//
//   <Eyebrow>TODAY'S SKY</Eyebrow>
//   <Heading>Mercury squares your Moon</Heading>
//   <Body>Something wants to be said carefully.</Body>
//   <Horizon />
//   <Button label="Read more" onPress={...} />

import { ReactNode } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Polygon } from 'react-native-svg'; // already in package.json
import { colors, fonts, radius, shadow, spacing, type } from '@/constants/theme';

// Every text component accepts children (the text) and an optional style
// override, so you can tweak margins per screen without new components.
type TextChildProps = { children: ReactNode; style?: StyleProp<TextStyle> };

// ---------- BRAND MARK ----------

// ▲ The triangle from the logo, drawn as vector art so it's crisp at any size.
export function TriangleMark({ size = 14, color = colors.text }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10">
      {/* Three x,y corner points: top-center, bottom-right, bottom-left */}
      <Polygon points="5,0.8 9.4,9.2 0.6,9.2" fill={color} />
    </Svg>
  );
}

// The "horizon" — the app's signature divider. A hairline with the triangle
// resting on it: grounded + celestial. Use it where you'd otherwise reach
// for a plain gray line.
export function Horizon({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.horizonRow, style]}>
      <View style={styles.horizonLine} />
      <TriangleMark size={9} color={colors.gold} />
      <View style={styles.horizonLine} />
    </View>
  );
}

// ---------- TYPOGRAPHY ----------
// Rule of thumb: Playfair (serif) only at heading sizes and above.
// Outfit (sans) for everything you actually read or tap.

// Playfair, biggest — reserved for big reveal moments.
export function Hero({ children, style }: TextChildProps) {
  return <Text style={[styles.hero, style]}>{children}</Text>;
}

// Playfair — screen titles.
export function Title({ children, style }: TextChildProps) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

// Playfair — section/card headings.
export function Heading({ children, style }: TextChildProps) {
  return <Text style={[styles.heading, style]}>{children}</Text>;
}

// Playfair italic — taglines and pull-quotes ("A mirror, not a map.")
export function Tagline({ children, style }: TextChildProps) {
  return <Text style={[styles.tagline, style]}>{children}</Text>;
}

// Tiny letterspaced ALL-CAPS label in deep gold — the editorial "eyebrow"
// that sits above a headline. Pass regular text; it uppercases itself.
export function Eyebrow({ children, style }: TextChildProps) {
  return <Text style={[styles.eyebrow, style]}>{children}</Text>;
}

// Outfit — default reading text, in softened ink with generous line height.
export function Body({ children, style }: TextChildProps) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

// Outfit — small muted metadata (dates, counts, hints).
export function Caption({ children, style }: TextChildProps) {
  return <Text style={[styles.caption, style]}>{children}</Text>;
}

// ---------- SURFACES ----------

// A card: warm white, hairline border, soft shadow. This replaces the old
// dark `backgroundColor: colors.surface` blocks everywhere.
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ---------- BUTTON ----------

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  // 'primary' = slate blue (the default action)
  // 'terracotta' = the ONE high-energy action on a screen (share, reveal)
  // 'ghost' = quiet outlined secondary action
  variant?: 'primary' | 'terracotta' | 'ghost';
  style?: StyleProp<ViewStyle>;
  // Overrides the label color — e.g. a 'ghost' destructive action that
  // still wants error-red text instead of the default accent.
  labelColor?: string;
};

export function Button({ label, onPress, disabled, variant = 'primary', style, labelColor }: ButtonProps) {
  const bg =
    variant === 'primary' ? colors.accent :
    variant === 'terracotta' ? colors.terracotta :
    'transparent';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      // `pressed` gives instant tactile feedback — key iOS-quality detail.
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        variant === 'ghost' && styles.buttonGhost,
        (disabled || pressed) && { opacity: disabled ? 0.4 : 0.85 },
        style,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'ghost' && { color: colors.accent },
          labelColor && { color: labelColor },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ---------- STYLES ----------

const styles = StyleSheet.create({
  horizonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  horizonLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },

  hero: { fontFamily: fonts.displayBold, fontSize: type.hero, color: colors.text, lineHeight: 42 },
  title: { fontFamily: fonts.display, fontSize: type.title, color: colors.text, lineHeight: 34 },
  heading: { fontFamily: fonts.display, fontSize: type.heading, color: colors.text, lineHeight: 27 },
  tagline: {
    fontFamily: fonts.displayItalic,
    fontSize: type.body + 1,
    color: colors.muted,
    lineHeight: 25,
  },
  eyebrow: {
    fontFamily: fonts.bodySemibold,
    fontSize: type.eyebrow,
    color: colors.goldDeep,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  body: { fontFamily: fonts.body, fontSize: type.body, color: colors.inkSoft, lineHeight: 24 },
  caption: { fontFamily: fonts.body, fontSize: type.caption, color: colors.muted, lineHeight: 17 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow.card,
  },

  button: {
    borderRadius: radius.md,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  buttonGhost: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  buttonText: { fontFamily: fonts.bodySemibold, fontSize: type.body, color: colors.bg },
});
