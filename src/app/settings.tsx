// Account settings — reached from the gear on the Chart tab. Sign out lives
// here (not on Today), with room to grow into birth-data edits, notifications,
// and legal links.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing } from '@/constants/theme';
import { Body, Caption, Card, Eyebrow, Title } from '@/components/ui';
import ConfirmDelete from '@/components/confirm-delete';
import { deleteAccount as deleteAccountOnServer } from '@/lib/api';
import { supabase } from '@/lib/supabase';

type Profile = {
  name: string;
  birth_date: string;
  birth_time: string | null;
  birth_place_label: string;
};

function formatBirthDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function Settings() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmingDeleteAccount, setConfirmingDeleteAccount] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error: dbError } = await supabase
        .from('profiles')
        .select('name, birth_date, birth_time, birth_place_label')
        .eq('id', user.id)
        .single<Profile>();
      if (!active) return;
      if (dbError) setError('Could not load your profile.');
      else {
        setEmail(user.email ?? '');
        setProfile(data);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/chart');
  }

  async function signOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
  }

  async function deleteAccount() {
    setDeletingAccount(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in.');
      await deleteAccountOnServer(session.access_token);
      await supabase.auth.signOut();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not delete account.');
      setConfirmingDeleteAccount(false);
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.container}>
      <Pressable onPress={goBack}><Text style={styles.back}>← My Chart</Text></Pressable>
      <Title>Settings</Title>

      {loading && <ActivityIndicator color={colors.accent} style={styles.spinner} />}
      {!!error && <Body style={styles.error}>{error}</Body>}

      {profile && (
        <>
          <Eyebrow style={styles.section}>Account</Eyebrow>
          <Card>
            <Caption>Email</Caption>
            <Body style={styles.rowValue}>{email || '—'}</Body>
            <Caption style={styles.rowLabel}>Name</Caption>
            <Body style={styles.rowValue}>{profile.name}</Body>
          </Card>

          <Eyebrow style={styles.section}>Birth chart</Eyebrow>
          <Card>
            <Caption>Date</Caption>
            <Body style={styles.rowValue}>{formatBirthDate(profile.birth_date)}</Body>
            <Caption style={styles.rowLabel}>Time</Caption>
            <Body style={styles.rowValue}>
              {profile.birth_time ?? 'Unknown — chart uses noon'}
            </Body>
            <Caption style={styles.rowLabel}>Place</Caption>
            <Body style={styles.rowValue}>{profile.birth_place_label}</Body>
          </Card>

          <Eyebrow style={styles.section}>Privacy</Eyebrow>
          <Caption style={styles.privacy}>
            Your journal is never shared or sold.
          </Caption>

          <View style={styles.accountActionsSection}>
            {confirmingSignOut ? (
              <ConfirmDelete
                message="Sign out of Natal on this device?"
                confirmLabel={signingOut ? 'Signing out…' : 'Sign out'}
                busy={signingOut}
                onConfirm={signOut}
                onCancel={() => setConfirmingSignOut(false)}
              />
            ) : (
              <Pressable onPress={() => setConfirmingSignOut(true)}>
                <Text style={styles.signOutLink}>Sign out</Text>
              </Pressable>
            )}

            {confirmingDeleteAccount ? (
              <ConfirmDelete
                message="Delete your Natal account? This permanently removes your profile, journal, and all saved data. This can’t be undone."
                confirmLabel={deletingAccount ? 'Deleting…' : 'Delete account'}
                busy={deletingAccount}
                onConfirm={deleteAccount}
                onCancel={() => setConfirmingDeleteAccount(false)}
              />
            ) : (
              <Pressable onPress={() => setConfirmingDeleteAccount(true)}>
                <Text style={styles.deleteAccountLink}>Delete account</Text>
              </Pressable>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingTop: 60, paddingBottom: spacing.xxl },
  back: { color: colors.accent, fontSize: 15, marginBottom: spacing.lg },
  spinner: { marginTop: spacing.xl },
  error: { color: colors.error, marginTop: spacing.lg },
  section: { marginTop: spacing.xl, marginBottom: spacing.sm },
  rowLabel: { marginTop: spacing.md },
  rowValue: { marginTop: spacing.xs },
  privacy: { lineHeight: 20 },
  accountActionsSection: { marginTop: spacing.xxl, alignItems: 'center', gap: spacing.lg },
  signOutLink: { color: colors.error, fontSize: 15 },
  deleteAccountLink: { color: colors.error, fontSize: 15, opacity: 0.75 },
});
