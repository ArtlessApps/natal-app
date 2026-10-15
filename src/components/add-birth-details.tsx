// Shown wherever a feature needs a natal chart but the user skipped birth
// details at onboarding — they're optional (App Store 5.1.1(v)), so these
// screens offer to collect them instead of assuming they exist.
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { spacing } from '@/constants/theme';
import { Body, Button, Card, Heading } from '@/components/ui';

export default function AddBirthDetails({ title, body, style }: {
  title: string;
  body: string;
  style?: StyleProp<ViewStyle>;
}) {
  const router = useRouter();
  return (
    <Card style={style}>
      <Heading>{title}</Heading>
      <Body style={styles.body}>{body}</Body>
      <Button
        label="Add birth details"
        onPress={() => router.push({ pathname: '/onboarding', params: { add: '1' } })}
        style={styles.button}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: spacing.sm },
  button: { marginTop: spacing.lg },
});
