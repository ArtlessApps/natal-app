// Lets an anonymous session back itself up with a real identity — same
// user id, same chart/journal data, now recoverable after a reinstall or
// on another device. Shown only for anonymous accounts (see settings.tsx);
// real sign-in stays entirely optional (App Store Guideline 5.1.1(v)).
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { isAppleSignInAvailable, linkApple, startEmailLink, verifyEmailLink } from '@/lib/auth';
import { colors, fonts, radius, spacing, type } from '@/constants/theme';
import { Body, Button, Caption } from '@/components/ui';

export default function AccountBackup({ onLinked }: { onLinked: () => void }) {
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [phase, setPhase] = useState<'start' | 'code'>('start');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
    const result = await linkApple();
    setBusy(false);
    if (result.ok) onLinked();
    else if (!result.canceled) setError(result.message);
  }

  async function sendCode() {
    setBusy(true);
    setError('');
    const { error } = await startEmailLink(email.trim());
    setBusy(false);
    if (error) setError(error.message || 'Something went wrong sending the code — try again.');
    else setPhase('code');
  }

  async function verifyCode() {
    setBusy(true);
    setError('');
    const { error } = await verifyEmailLink(email.trim(), code.trim());
    setBusy(false);
    if (error) setError('That code didn’t work — check it and try again.');
    else onLinked();
  }

  return (
    <View>
      <Body style={styles.copy}>
        Your journal lives on this device only right now. Back it up so you can restore
        it after a reinstall or on a new phone.
      </Body>

      {appleAvailable && phase === 'start' && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={radius.md}
          style={styles.appleButton}
          onPress={handleApple}
        />
      )}

      {phase === 'start' ? (
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
            label={busy ? 'Sending…' : 'Back up with email'}
            onPress={sendCode}
            disabled={busy || !email.includes('@')}
            variant="ghost"
          />
        </>
      ) : (
        <>
          <Body style={styles.hint}>We emailed a code to {email}</Body>
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
          <Button
            label={busy ? 'Checking…' : 'Confirm'}
            onPress={verifyCode}
            disabled={busy || code.length < 6}
          />
          <Pressable onPress={() => !busy && setPhase('start')}>
            <Text style={styles.link}>Use a different email</Text>
          </Pressable>
        </>
      )}

      {!!error && <Caption style={styles.error}>{error}</Caption>}
    </View>
  );
}

const styles = StyleSheet.create({
  copy: { marginBottom: spacing.md },
  appleButton: { width: '100%', height: 48, marginBottom: spacing.md },
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
  codeInput: { textAlign: 'center', fontSize: 24, letterSpacing: 10, fontFamily: fonts.bodyMedium },
  hint: { marginBottom: spacing.sm },
  link: { color: colors.accent, fontSize: type.small, textAlign: 'center', marginTop: spacing.md },
  error: { color: colors.error, textAlign: 'center', marginTop: spacing.md },
});
