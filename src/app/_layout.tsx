import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Session } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { registerForPushNotifications } from '../lib/notifications';
import { colors } from '../constants/theme';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments(); // which screen group we're currently in

  // 1) Learn the login state, and keep listening for changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    // Fires on sign-in, sign-out, token refresh — keeps state in sync.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // 2) When logged in, check whether onboarding is done (profile exists).
  // Re-runs on navigation (not just on session change) so it picks up the
  // profile row onboarding just created — otherwise a stale `false` from
  // right after sign-in bounces the "See today's sky" tap back to onboarding.
  useEffect(() => {
    if (!session) { setHasProfile(null); return; }
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
  // 'invite' is the public guest page (Step 8.6): a signed-in user opening
  // their own link must not be bounced to the tabs.
  const ALLOWED_STACK_SEGMENTS = ['reveal', 'journal', 'learn', 'friends', 'invite'];
  useEffect(() => {
    if (loading) return;
    const inTabs = segments[0] === '(tabs)';
    const onAllowedStackScreen = ALLOWED_STACK_SEGMENTS.includes(segments[0] ?? '');

    if (!session && segments[0] !== 'sign-in' && segments[0] !== 'invite') {
      // Guests hitting an /invite/<token> link are logged out by design —
      // don't bounce them to sign-in (Step 8.6D).
      router.replace('/sign-in');
    } else if (session && hasProfile === false && segments[0] !== 'onboarding' && segments[0] !== 'reveal') {
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

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
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
      </Stack>
    </>
  );
}
