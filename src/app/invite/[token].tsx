// Public guest page (PRD §4.5, Step 8.6). No auth — the token in the URL is
// the credential; root-layout guards exempt this route (Step 8.6D). It runs on
// web too, so nothing native-only here. Four phases: landing → form → reveal
// → locked. Gift before gate: the guest always gets their own Big 3; only the
// comparison is locked behind the app.
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { Body, Button, Eyebrow } from '@/components/ui';
import { APP_STORE_URL, TESTFLIGHT_MODE } from '@/constants/links';
import BirthDataForm from '@/components/birth-data-form';
import Big3Cards from '@/components/big3-cards';
import InvitePayoff from '@/components/invite-payoff';
import { useInvite } from '@/lib/use-invite';

export default function InvitePage() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const {
    phase, setPhase, info, loading, notActive, loadError,
    busy, submitError, big3, inviterName, timeKnown, handleSubmit,
  } = useInvite(token);

  if (loading) {
    return (
      <View style={[styles.wrap, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.wrap, styles.center]}>
        <Body style={styles.msg}>{loadError}</Body>
      </View>
    );
  }

  if (notActive) {
    return (
      <View style={[styles.wrap, styles.center]}>
        <Text style={styles.glyph}>✦</Text>
        <Body style={styles.msg}>This invite link isn’t active.</Body>
      </View>
    );
  }

  if (info?.status === 'complete') {
    return (
      <View style={[styles.wrap, styles.center]}>
        <Text style={styles.glyph}>✦</Text>
        <Body style={styles.msg}>This invite was already used.</Body>
      </View>
    );
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.container}>
      {phase === 'landing' && (
        <InvitePayoff title={`${inviterName} wants to compare charts with you`}>
          <Body style={styles.sub}>
            Enter your birth details to see your own Sun, Moon, and Rising — then how your skies fit together.
          </Body>
          <Button label="Cast my chart" onPress={() => setPhase('form')} style={styles.button} />
        </InvitePayoff>
      )}

      {phase === 'form' && (
        <>
          <Eyebrow style={styles.eyebrow}>Your Birth Details</Eyebrow>
          <Body style={styles.sub}>They stay yours. {inviterName} only sees how you two compare.</Body>
          <BirthDataForm submitLabel="Cast my chart" busy={busy} error={submitError} onSubmit={handleSubmit} namePlaceholder="Your name" />
        </>
      )}

      {phase === 'reveal' && big3 && (
        <>
          <Eyebrow style={styles.eyebrow}>Your Big 3</Eyebrow>
          <Big3Cards big3={big3} timeKnown={timeKnown} />
          <Button
            label={`See your compatibility with ${inviterName}`}
            onPress={() => setPhase('locked')}
            style={styles.button}
          />
        </>
      )}

      {phase === 'locked' && (
        <InvitePayoff title={`Your compatibility with ${inviterName} is ready.`}>
          {TESTFLIGHT_MODE || !APP_STORE_URL ? (
            <Body style={styles.sub}>
              Natal is in early access — {inviterName} can show you in the app.
            </Body>
          ) : (
            <Button label="Get Natal" onPress={() => Linking.openURL(APP_STORE_URL)} style={styles.button} />
          )}
        </InvitePayoff>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center', padding: spacing.lg + 4, gap: spacing.md },
  container: { padding: spacing.lg + 4, paddingTop: 90, paddingBottom: spacing.xxl },
  glyph: { color: colors.gold, fontSize: 40 },
  eyebrow: { marginBottom: spacing.sm + 4, textAlign: 'center' },
  sub: { textAlign: 'center', marginBottom: spacing.xs },
  msg: { textAlign: 'center' },
  button: { marginTop: spacing.lg, alignSelf: 'stretch' },
});
