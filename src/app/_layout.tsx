import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Session } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';
// Each weight of a Google Font is imported individually. useFonts loads
// them into memory and tells us when they're ready.
import {
  useFonts,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_500Medium_Italic,
} from '@expo-google-fonts/playfair-display';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { supabase } from '../lib/supabase';
import { ensureSession } from '../lib/auth';
import { registerForPushNotifications } from '../lib/notifications';
import { configurePurchases, syncPurchasesUser } from '../lib/subscription';
import { colors, spacing } from '../constants/theme';
import { Body, Button } from '../components/ui';

// Keep the native splash screen visible until we explicitly hide it below.
SplashScreen.preventAutoHideAsync();

Sentry.init({
  dsn: 'https://ed795cfeaad295ea11f9f5cdab33307e@o4511723132616704.ingest.us.sentry.io/4511723143233536',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const router = useRouter();
  const segments = useSegments(); // which screen group we're currently in

  // NEW: load the brand fonts. fontsLoaded flips to true once they're in memory.
  // The keys here become the fontFamily names used in constants/theme.ts.
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_500Medium_Italic,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  // NEW: once fonts are ready, drop the splash screen.
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  // 0) RevenueCat — configure once, then keep the RC user id in sync with
  // the Supabase session (see lib/subscription.ts).
  useEffect(() => {
    configurePurchases();
  }, []);

  // 1) Learn the login state, and keep listening for changes. Also resets
  // hasProfile the moment session goes away (right here, inside the same
  // callback that clears it) rather than in a separate effect reacting to
  // `session` — otherwise a stale hasProfile=true from a previous signed-in
  // user could survive into the next sign-in and skip effect 2's check.
  //
  // No session on first launch does NOT mean "send them to sign-in" — that
  // was the App Store 5.1.1(v) rejection (non-account features required
  // registering). ensureSession() silently creates an anonymous session
  // instead, so onboarding/chart/journal/learn all work with nothing typed
  // in. Real sign-in stays available, but only ever reached voluntarily
  // (onboarding's "I already have an account" link, Settings' backup flow).
  useEffect(() => {
    let cancelled = false;
    ensureSession().then((s) => {
      if (cancelled) return;
      setSession(s);
      setSessionError(!s);
      if (!s) setHasProfile(null);
      setLoading(false);
      syncPurchasesUser(s?.user.id ?? null);
    });
    // Fires on sign-in, sign-out, token refresh — keeps state in sync.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) setHasProfile(null);
      syncPurchasesUser(s?.user.id ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [retryTick]);

  // 2) When logged in, check whether onboarding is done (profile exists).
  // Re-runs on navigation (not just on session change) so it picks up the
  // profile row onboarding just created — otherwise a stale `false` from
  // right after sign-in bounces the "See today's sky" tap back to onboarding.
  useEffect(() => {
    if (!session) return; // reset already handled in effect 1, where session is cleared
    if (hasProfile === true) return; // already confirmed, nothing left to check
    supabase
      .from('profiles')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle() // returns null instead of erroring when no row exists
      .then(({ data }) => setHasProfile(!!data));
  }, [session, segments]);

  // 3) Route based on state. segments[0] tells us where we are,
  //    so we only redirect when we're in the WRONG place (avoids loops).
  // Top-level stack screens (outside the tab group) that a signed-in,
  // onboarded user is allowed to be on without getting bounced back to
  // the tabs — add new ones here as they're built (e.g. journal/[id]).
  // 'invite' is the public guest page (Step 8.6) — a guest now also gets a
  // silent anonymous session (see effect 1), so it needs the same
  // no-profile-yet exemption as 'onboarding'/'reveal', or they'd get bounced
  // into onboarding mid-invite. 'sign-in' is reached only voluntarily now
  // (never as a forced gate) — exempt it too so tapping "sign in" doesn't
  // immediately bounce back out.
  const NO_PROFILE_EXEMPT_SEGMENTS = ['onboarding', 'reveal', 'invite', 'sign-in'];
  const ALLOWED_STACK_SEGMENTS = ['reveal', 'journal', 'learn', 'friends', 'invite', 'settings', 'sign-in'];
  useEffect(() => {
    if (loading) return;
    const inTabs = segments[0] === '(tabs)';
    const onAllowedStackScreen = ALLOWED_STACK_SEGMENTS.includes(segments[0] ?? '');

    if (session && hasProfile === false && !NO_PROFILE_EXEMPT_SEGMENTS.includes(segments[0] ?? '')) {
      router.replace('/onboarding');
    } else if (session && hasProfile === true && !inTabs && !onAllowedStackScreen) {
      router.replace('/(tabs)');
    }
  }, [loading, session, hasProfile, segments]);

  // 4) Refresh the Expo push token whenever a signed-in, onboarded user
  // opens the app (covers token rotation + the case where EAS projectId
  // was filled in after they first granted permission on reveal).
  useEffect(() => {
    if (!session || hasProfile !== true) return;
    registerForPushNotifications().catch((e) =>
      console.warn('[push] token refresh failed', e)
    );
  }, [session, hasProfile]);

  // 5) Deep-link: tapping a daily push opens the Today tab (PRD 4.7).
  // Skip on web — Expo Push isn't available there, and the listener is a no-op.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string' && url.length > 0) {
        router.push(url as '/');
      } else {
        router.push('/');
      }
    });
    return () => sub.remove();
  }, [router]);

  // Wait for BOTH auth state and fonts before showing anything.
  if (loading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // Couldn't even get a silent anonymous session (almost always: no network
  // on first launch). Never falls back to a sign-in wall — just retry.
  if (sessionError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: spacing.xl, gap: spacing.md }}>
        <Body style={{ textAlign: 'center' }}>Couldn’t connect. Check your connection and try again.</Body>
        <Button label="Try again" onPress={() => { setLoading(true); setRetryTick((t) => t + 1); }} />
      </View>
    );
  }

  return (
    <>
      {/* "dark" = dark status-bar icons, which is what a cream background needs */}
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="reveal" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="journal/[id]" />
        <Stack.Screen name="learn/[id]" />
        <Stack.Screen name="learn/paywall" />
        <Stack.Screen name="friends/add" />
        <Stack.Screen name="friends/[id]" />
        <Stack.Screen name="invite/[token]" />
        <Stack.Screen name="settings" />
      </Stack>
    </>
  );
}

export default Sentry.wrap(RootLayout);
