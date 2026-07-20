// This is the "exemplar" screen — the visual reference for how every other
// screen should feel.
//
//   • Brand moment up top: gold triangle, NATAL wordmark (Outfit Bold,
//     wide letterspacing), tagline in Playfair italic
//   • Sign in with Apple (iOS) is the primary path for App Review + users
//   • Email OTP remains as a secondary option
//   • The Horizon divider separates brand from action

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';
import { isAppleSignInAvailable, signInWithApple } from '@/lib/auth';
import { colors, fonts, radius, spacing, type } from '@/constants/theme';
import { Body, Button, Caption, Horizon, Tagline, TriangleMark } from '@/components/ui';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [phase, setPhase] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const available = await isAppleSignInAvailable();
      if (!cancelled) setAppleAvailable(available);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleApple() {
    if (busy) return;
    setBusy(true);
    setError('');
    const result = await signInWithApple();
    setBusy(false);
    if (result.ok || result.canceled) return;
    setError(result.message);
    // On success the root layout hears the auth change and routes us.
  }

  async function sendCode() {
    setBusy(true);
    setError('');
    // shouldCreateUser: true → first-time emails create an account automatically
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) setError(error.message || 'Something went wrong sending the code — try again.');
    else setPhase('code');
  }

  async function verifyCode() {
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    });
    setBusy(false);
    if (error) setError('That code didn’t work — check it and try again.');
    // On success the root layout hears the auth change and routes us.
  }

  return (
    // KeyboardAvoidingView nudges content up when the keyboard opens,
    // so the button never hides behind it — a small but important iOS detail.
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ---- Brand block ---- */}
      <View style={styles.brand}>
        <TriangleMark size={18} color={colors.gold} />
        <Text style={styles.wordmark}>NATAL</Text>
        <Tagline>A mirror, not a map.</Tagline>
      </View>

      <Horizon />

      {appleAvailable && phase === 'email' && (
        <>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={radius.md}
            style={styles.appleButton}
            onPress={handleApple}
          />
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Caption style={styles.orText}>or</Caption>
            <View style={styles.orLine} />
          </View>
        </>
      )}

      {phase === 'email' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            editable={!busy}
          />
          <Button
            label={busy ? 'Sending…' : 'Send code'}
            onPress={sendCode}
            disabled={busy || !email.includes('@')}
          />
          <Caption style={styles.hint}>
            No password. We’ll email you a code.
          </Caption>
        </>
      ) : (
        <>
          <Body style={styles.codeHint}>We emailed a code to {email}</Body>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="123456"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            maxLength={10}
            value={code}
            onChangeText={setCode}
            editable={!busy}
          />
          {/* Supabase's configured OTP length varies by project (this one issues 8 digits), so accept any reasonable length rather than hardcoding one. */}
          <Button
            label={busy ? 'Checking…' : 'Sign in'}
            onPress={verifyCode}
            disabled={busy || code.length < 6}
          />
          <Text style={styles.link} onPress={() => !busy && setPhase('email')}>
            Use a different email
          </Text>
        </>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  brand: { alignItems: 'center', gap: spacing.sm },
  // The wordmark: geometric sans, heavy weight, wide tracking — matches the logo.
  wordmark: {
    fontFamily: fonts.bodyBold,
    fontSize: 30,
    letterSpacing: 8,
    color: colors.text,
    // letterSpacing pads the right of the last letter too; nudge to re-center.
    marginRight: -8,
  },
  appleButton: {
    width: '100%',
    height: 48,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  orText: {
    color: colors.muted,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: type.body,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 16,
    marginBottom: spacing.md,
  },
  // The code input gets big centered digits — feels considered, not generic.
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 10,
    fontFamily: fonts.bodyMedium,
  },
  codeHint: { textAlign: 'center', marginBottom: spacing.md },
  hint: { textAlign: 'center', marginTop: spacing.md },
  link: {
    fontFamily: fonts.bodyMedium,
    fontSize: type.small,
    color: colors.accent,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  error: {
    fontFamily: fonts.body,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
