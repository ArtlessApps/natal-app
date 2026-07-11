// This is the design system. Every screen imports from here, so this ONE
// file controls the entire app's look. We keep the ORIGINAL six keys
// (bg, surface, text, muted, accent, error) with the same names — that means
// every existing screen instantly picks up the new brand with zero edits.
// Then we add new tokens for the finer details.

export const colors = {
  // ---- original keys (every screen already uses these) ----
  bg: '#faf7f2',      // Cream — the "paper" everything sits on
  surface: '#fffdf9', // Warm white — cards float just barely above the cream
  text: '#1a1612',    // Near Black — ink
  muted: '#8a8175',   // Warm gray — secondary text (ink softened toward cream)
  accent: '#4a6e8a',  // Slate Blue — THE interactive color: buttons, links
  error: '#b3402a',   // Deep terracotta on a light background

  // ---- new brand tokens ----
  terracotta: '#d4734a', // Energy. Use sparingly — roughly one moment per screen
  gold: '#c4a67a',       // Celestial details: glyphs, stars, the horizon triangle
  goldDeep: '#9a7c48',   // Darker gold for when gold must be read as TEXT on cream
  border: '#e9e2d5',     // Warm hairline — how cards get edges on a light theme
  inkSoft: '#4a443c',    // Softened ink for long body text (pure black feels harsh)
};

// IMPORTANT React Native quirk: custom fonts don't understand fontWeight.
// Each weight is loaded as its OWN font family. So instead of writing
// `fontWeight: '700'`, you write `fontFamily: fonts.bodyBold`.
// These string names must exactly match what we load in src/app/_layout.tsx (Step 3).
export const fonts = {
  display: 'PlayfairDisplay_600SemiBold',            // headings — the editorial serif
  displayBold: 'PlayfairDisplay_700Bold',            // big-moment headlines
  displayItalic: 'PlayfairDisplay_500Medium_Italic', // quotes & pull-quotes
  body: 'Outfit_400Regular',                         // default UI text
  bodyMedium: 'Outfit_500Medium',                    // labels, tab titles
  bodySemibold: 'Outfit_600SemiBold',                // buttons, emphasis
  bodyBold: 'Outfit_700Bold',                        // the NATAL wordmark, stats
};

// A small type scale. Picking sizes from this list (instead of inventing
// new ones per screen) is 50% of what makes a design feel "professional."
export const type = {
  hero: 34,    // reveal moments, sign-in wordmark area
  title: 26,   // screen titles
  heading: 20, // section headings, card titles
  body: 16,    // default text
  small: 14,   // secondary text
  caption: 12, // metadata, timestamps
  eyebrow: 11, // tiny letterspaced labels (ALL CAPS)
};

// Spacing on a 4pt grid — same idea: consistency over cleverness.
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

// Corner radii. Slightly generous corners read as "soft/earthy."
export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };

// Light themes can't fake depth with dark backgrounds the way the old purple
// theme did. Depth now comes from a hairline border + a whisper of warm shadow.
// Spread this object into a card style: { ...shadow.card }
export const shadow = {
  card: {
    shadowColor: '#1a1612',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2, // the Android equivalent of shadow
  },
};
