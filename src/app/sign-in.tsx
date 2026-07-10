// Two-phase screen: enter email → we send an OTP code → enter code.
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/theme';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [phase, setPhase] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function sendCode() {
    setBusy(true); setError('');
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
    setBusy(true); setError('');
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    });
    setBusy(false);
    if (error) setError('That code didn’t work — check it and try again.');
    // On success the root layout hears the auth change and routes us. No navigation needed here.
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Natal</Text>
      <Text style={styles.tagline}>The sky remembers. So will this.</Text>

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
          />
          <Pressable style={styles.button} onPress={sendCode} disabled={busy || !email.includes('@')}>
            <Text style={styles.buttonText}>{busy ? 'Sending…' : 'Send code'}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.hint}>We emailed a code to {email}</Text>
          <TextInput
            style={styles.input}
            placeholder="123456"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            maxLength={10}
            value={code}
            onChangeText={setCode}
          />
          {/* Supabase's configured OTP length varies by project (this one issues 8 digits), so accept any reasonable length rather than hardcoding one. */}
          <Pressable style={styles.button} onPress={verifyCode} disabled={busy || code.length < 6}>
            <Text style={styles.buttonText}>{busy ? 'Checking…' : 'Sign in'}</Text>
          </Pressable>
          <Pressable onPress={() => setPhase('email')}>
            <Text style={styles.link}>Use a different email</Text>
          </Pressable>
        </>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 28 },
  title: { color: colors.text, fontSize: 36, fontWeight: '700', textAlign: 'center' },
  tagline: { color: colors.muted, textAlign: 'center', marginBottom: 40, marginTop: 6 },
  hint: { color: colors.muted, textAlign: 'center', marginBottom: 12 },
  input: {
    backgroundColor: colors.surface, color: colors.text, borderRadius: 12,
    padding: 16, fontSize: 16, marginBottom: 12,
  },
  button: { backgroundColor: colors.accent, borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: colors.bg, fontWeight: '600', fontSize: 16 },
  link: { color: colors.accent, textAlign: 'center', marginTop: 16 },
  error: { color: colors.error, textAlign: 'center', marginTop: 16 },
});
