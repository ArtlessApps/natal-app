// Auth helpers. Screens call these; they never talk to Apple/Supabase directly
// beyond the shared client in lib/supabase.ts.
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import type { AuthError, Session } from '@supabase/supabase-js';
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
 * Guarantees a Supabase session exists without ever asking the user for
 * personal info: reuses one if present, otherwise creates a silent
 * anonymous session (App Store Guideline 5.1.1(v) — non-account-based
 * features must work without registering). Onboarding/chart/journal/learn
 * all key off `session.user.id`, which an anonymous session has too, so
 * nothing downstream needs to know whether it's anonymous or not.
 */
export async function ensureSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn('[auth] anonymous sign-in failed', error.message);
    return null;
  }
  return anon.session;
}

/**
 * Shared Sign in with Apple flow: gets the native credential, then hands
 * the identity token to `exchange` — either a fresh sign-in or a link onto
 * the current session — and persists the one-time name grant either way.
 */
async function withAppleCredential(
  exchange: (identityToken: string) => Promise<{ error: AuthError | null }>
): Promise<AppleSignInResult> {
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

    const { error } = await exchange(credential.identityToken);

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

/**
 * Native Sign in with Apple → Supabase session via identity token. Used on
 * the sign-in screen, where there's no session yet (fresh install) or the
 * user deliberately wants to switch to a different, already-existing account.
 */
export async function signInWithApple(): Promise<AppleSignInResult> {
  return withAppleCredential((token) =>
    supabase.auth.signInWithIdToken({ provider: 'apple', token })
  );
}

/**
 * Links Sign in with Apple onto the CURRENT session (typically anonymous)
 * instead of starting a new one — same user id, same chart/journal data,
 * now recoverable via Apple after a reinstall or on another device.
 */
export async function linkApple(): Promise<AppleSignInResult> {
  return withAppleCredential((token) =>
    supabase.auth.linkIdentity({ provider: 'apple', token })
  );
}

/** Starts linking an email onto the current (typically anonymous) session —
 * sends a one-time code to `email`. Finish with `verifyEmailLink`. */
export async function startEmailLink(email: string) {
  return supabase.auth.updateUser({ email });
}

/**
 * Verifies the code from `startEmailLink`. On success the account is no
 * longer anonymous but keeps the same id, so existing chart/journal data
 * carries over untouched — the same pattern Supabase documents for
 * converting an anonymous user to a permanent one.
 */
export async function verifyEmailLink(email: string, token: string) {
  return supabase.auth.verifyOtp({ email, token, type: 'email_change' });
}
