// Push-notification helpers for the daily reading (PRD 4.1 / 4.7).
// Permission is requested on the Big 3 reveal screen; the Expo push token
// is stored on profiles.push_token so natal-api's cron can send to it.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';

// Show banners while the app is foregrounded — otherwise a push that
// arrives while the user is already in Today would be silently dropped.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function easProjectId(): string | null {
  return (
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId ??
    null
  ) || null;
}

/**
 * Ask for notification permission (if needed), create the Android channel,
 * fetch an Expo push token, and write it to the signed-in user's profile.
 *
 * Returns the token on success, null if the user denied permission, the
 * platform doesn't support push (web), or EAS projectId isn't configured yet.
 * Never throws — reveal should still let the user into the app either way.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Expo Push doesn't work on web; skip quietly so local web testing still works.
  if (Platform.OS === 'web') return null;

  if (Platform.OS === 'android') {
    // Android 13+ won't show the permission prompt until a channel exists.
    await Notifications.setNotificationChannelAsync('daily', {
      name: 'Daily reading',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }
  if (status !== 'granted') return null;

  const projectId = easProjectId();
  if (!projectId) {
    // No EAS project yet — getExpoPushTokenAsync needs one. Permission was
    // still granted, so when projectId is filled in later a re-register
    // (e.g. next app launch) will pick up the token.
    console.warn('[push] EAS projectId missing — skipping token fetch');
    return null;
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('profiles').update({ push_token: token }).eq('id', user.id);
  }
  return token;
}
