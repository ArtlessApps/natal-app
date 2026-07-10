// Where invite links point. Localhost works for two-tab local testing;
// swap for the deployed web URL at Build Phase 10.
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:8081';

// The gate's destination once the listing exists (Build Phase 10).
export const APP_STORE_URL = '';
// While true, the locked screen shows early-access copy instead of a dead link.
export const TESTFLIGHT_MODE = true;
