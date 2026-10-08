// Where invite links point. Localhost works for two-tab local testing;
// swap for the deployed web URL at Build Phase 10.
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:8081';

// The gate's destination once the listing exists (Build Phase 10).
export const APP_STORE_URL = '';
// While true, the locked screen shows early-access copy instead of a dead link.
export const TESTFLIGHT_MODE = true;

// Legal pages on the marketing site (App Store + in-app Settings).
// Use the .html paths — they resolve whether or not the site has clean URLs.
export const PRIVACY_URL = 'https://nataljournal.com/privacy.html';
export const SUPPORT_URL = 'https://nataljournal.com/support.html';
// Natal Plus uses Apple's standard EULA (Guideline 3.1.2 — the paywall must
// link to it; the App Store description links to it too).
export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
