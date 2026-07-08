import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
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
  useEffect(() => {
    if (loading) return;
    const inTabs = segments[0] === '(tabs)';

    if (!session && segments[0] !== 'sign-in') {
      router.replace('/sign-in');
    } else if (session && hasProfile === false && segments[0] !== 'onboarding' && segments[0] !== 'reveal') {
      router.replace('/onboarding');
    } else if (session && hasProfile === true && !inTabs && segments[0] !== 'reveal') {
      router.replace('/(tabs)');
    }
  }, [loading, session, hasProfile, segments]);

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
      </Stack>
    </>
  );
}