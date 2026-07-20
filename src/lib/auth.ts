// Auth helpers. Screens call these; they never talk to Apple/Supabase directly
// beyond the shared client in lib/supabase.ts.
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';

export type AppleSignInResult =
  | { ok: true }
  | { ok: false; canceled: true }
  | { ok: false; canceled: false; message: string };

/** True only on iOS devices where Sign in with Apple is available. */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Native Sign in with Apple → Supabase session via identity token.
 * Apple only returns the user's name on the *first* authorization; we
 * persist it to user_metadata when present so onboarding can prefill.
 */
export async function signInWithApple(): Promise<AppleSignInResult> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return { ok: false, canceled: false, message: 'Apple didn’t return a sign-in token. Try again.' };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) {
      return {
        ok: false,
        canceled: false,
        message: error.message || 'Apple sign-in failed. Try again.',
      };
    }

    // Name is only present the first time the user authorizes this app.
    if (credential.fullName) {
      const parts = [
        credential.fullName.givenName,
        credential.fullName.middleName,
        credential.fullName.familyName,
      ].filter(Boolean);
      if (parts.length > 0) {
        await supabase.auth.updateUser({
          data: {
            full_name: parts.join(' '),
            given_name: credential.fullName.givenName,
            family_name: credential.fullName.familyName,
          },
        });
      }
    }

    return { ok: true };
  } catch (e: unknown) {
    const code =
      e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '';
    if (code === 'ERR_REQUEST_CANCELED') {
      return { ok: false, canceled: true };
    }
    const message =
      e instanceof Error ? e.message : 'Something went wrong with Apple sign-in.';
    return { ok: false, canceled: false, message };
  }
}
