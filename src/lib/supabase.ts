// One Supabase client for the whole app.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Expo Router's static web output pre-renders routes in Node during `expo
// start`/export, where `window` doesn't exist. AsyncStorage's web shim reads
// window.localStorage, so touching it during that server pass crashes Metro.
// persistSession: false makes supabase-js fall back to an in-memory store
// instead of touching storage at all.
const isServer = typeof window === 'undefined';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,       // keeps the session between app launches
      autoRefreshToken: !isServer, // renews the login quietly in the background
      persistSession: !isServer,
      detectSessionInUrl: false,   // we use OTP codes, not URL-based magic links
    },
  }
);
